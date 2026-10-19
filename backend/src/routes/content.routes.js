import { Router } from 'express';
import Razorpay from 'razorpay';
import Content from '../models/Content.js';
import User from '../models/User.js';
import Plan from '../models/Plan.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import { cloudinary } from '../config/cloudinary.js';
import { optionalUser, requireAdmin, requireUser } from '../middleware/auth.js';
import { USER_POST_TYPES, computePublishedExpiry, ensureDefaultPlans, getPostPlan, getPublicPlans, planSnapshot } from '../config/postPlans.js';
import { processExpiredContent } from '../services/contentLifecycle.js';
import { consumeActivePass, getPublishingAccess, releasePassSlot } from '../services/publishingAccess.js';
const router=Router();

const requiredMetaByType={
  post:['postCategory'],banner:['advertiserName'],job:['companyName','jobType','salary','vacancies'],event:['eventDate','eventTime','venue','organizer'],offer:['businessName','offerPrice','validUntil'],shop:['businessCategory','address','openingHours'],vehicle:['vehicleType','makeModel','year','fuel','kilometers','ownerCount'],worker:['workerCategory','experience','availability']
};
function validateTypeFields(type,meta={}){
  const missing=(requiredMetaByType[type]||[]).filter(key=>!String(meta?.[key]??'').trim());
  return missing;
}

function razorpay(){
  if(!process.env.RAZORPAY_KEY_ID||!process.env.RAZORPAY_KEY_SECRET)return null;
  return new Razorpay({key_id:process.env.RAZORPAY_KEY_ID,key_secret:process.env.RAZORPAY_KEY_SECRET});
}

function publicShape(item,{userId=null,includeComments=false}={}){
  const likes=Array.isArray(item.likes)?item.likes:[];
  const comments=Array.isArray(item.comments)?item.comments:[];
  const storyViews=Array.isArray(item.storyViews)?item.storyViews:[];
  const owner=item.ownerUserId&&typeof item.ownerUserId==='object'&&item.ownerUserId.name?item.ownerUserId:null;
  const ownerId=owner?String(owner._id):String(item.ownerUserId||'');
  const likedByMe=userId?likes.some(id=>String(id)===String(userId)):false;
  const isOwner=Boolean(userId&&ownerId&&String(userId)===ownerId);
  const shaped={...item,
    ownerUserId:owner?String(owner._id):item.ownerUserId,
    author:owner?{
      id:String(owner._id),name:owner.name,village:owner.village||'',address:owner.address||'',
      gender:owner.gender||'other',profilePhotoUrl:owner.profilePhotoUrl||''
    }:{id:null,name:item.source==='admin'?'Namma Madurandhagam':'User',village:'',address:'',gender:'other',profilePhotoUrl:''},
    likeCount:likes.length,
    commentCount:comments.length,
    shareCount:Number(item.shareCount||0),
    likedByMe
  };
  if(item.type==='status'&&isOwner)shaped.storyViewCount=storyViews.length;
  delete shaped.likes;
  delete shaped.storyViews;
  if(includeComments){
    shaped.comments=comments.map(c=>{
      const liveUser=c.userId&&typeof c.userId==='object'&&c.userId.name?c.userId:null;
      return {
        _id:String(c._id),
        userId:String(liveUser?liveUser._id:c.userId),
        userName:liveUser?.name||c.userName,
        userPhotoUrl:liveUser?.profilePhotoUrl||'',
        userGender:liveUser?.gender||'other',
        text:c.text,
        createdAt:c.createdAt
      };
    });
  }else delete shaped.comments;
  return shaped;
}

function activeFilter(id){
  const now=new Date();
  return {_id:id,status:'approved',purgedAt:null,userDeletedAt:null,$and:[{$or:[{expiresAt:null},{expiresAt:{$gt:now}}]},{$or:[{startsAt:null},{startsAt:{$lte:now}}]}]};
}

router.get('/plans',async(req,res,next)=>{try{
  const plans=await getPublicPlans();
  res.json({types:USER_POST_TYPES,plans});
}catch(e){next(e)}});


router.get('/user/publishing-access',requireUser,async(req,res,next)=>{try{
  const type=String(req.query.type||'');
  if(!['status','post'].includes(type))return res.status(400).json({message:'Publishing access is only used for Story and Post'});
  res.json(await getPublishingAccess(req.user.userId,type));
}catch(e){next(e)}});

router.get('/',optionalUser,async(req,res,next)=>{try{
  await processExpiredContent().catch(()=>{});
  const filter={status:'approved',purgedAt:null,userDeletedAt:null};
  if(req.query.type)filter.type=req.query.type;
  const now=new Date();
  filter.$and=[{$or:[{expiresAt:null},{expiresAt:{$gt:now}}]},{$or:[{startsAt:null},{startsAt:{$lte:now}}]}];
  const items=await Content.find(filter).populate('ownerUserId','name village address gender profilePhotoUrl').sort({sortOrder:1,createdAt:-1}).lean();
  res.json(items.map(item=>publicShape(item,{userId:req.user?.userId})));
}catch(e){next(e)}});

router.get('/public/:id',optionalUser,async(req,res,next)=>{try{
  await processExpiredContent().catch(()=>{});
  const item=await Content.findOne(activeFilter(req.params.id))
    .populate('ownerUserId','name village address gender profilePhotoUrl')
    .populate('comments.userId','name gender profilePhotoUrl')
    .lean();
  if(!item)return res.status(404).json({message:'Post not found or no longer active'});
  res.json(publicShape(item,{userId:req.user?.userId,includeComments:item.type==='post'}));
}catch(e){next(e)}});

router.post('/public/:id/like',requireUser,async(req,res,next)=>{try{
  const item=await Content.findOne(activeFilter(req.params.id));
  if(!item)return res.status(404).json({message:'Post not found or no longer active'});
  if(item.type!=='post')return res.status(400).json({message:'Likes are available for normal posts only'});
  const userId=String(req.user.userId);
  const index=item.likes.findIndex(id=>String(id)===userId);
  let liked;
  if(index>=0){item.likes.splice(index,1);liked=false}else{item.likes.push(req.user.userId);liked=true}
  await item.save();
  res.json({liked,likeCount:item.likes.length});
}catch(e){next(e)}});

router.post('/public/:id/comments',requireUser,async(req,res,next)=>{try{
  const text=String(req.body?.text||'').trim();
  if(!text)return res.status(400).json({message:'Comment cannot be empty'});
  if(text.length>500)return res.status(400).json({message:'Comment must be 500 characters or less'});
  const item=await Content.findOne(activeFilter(req.params.id));
  if(!item)return res.status(404).json({message:'Post not found or no longer active'});
  if(item.type!=='post')return res.status(400).json({message:'Comments are available for normal posts only'});
  const user=await User.findById(req.user.userId).select('name gender profilePhotoUrl').lean();
  if(!user)return res.status(401).json({message:'User account not found'});
  item.comments.push({userId:req.user.userId,userName:user.name,text});
  await item.save();
  const comment=item.comments[item.comments.length-1];
  res.status(201).json({
    comment:{
      _id:String(comment._id),userId:String(comment.userId),userName:user.name,
      userPhotoUrl:user.profilePhotoUrl||'',userGender:user.gender||'other',
      text:comment.text,createdAt:comment.createdAt
    },
    commentCount:item.comments.length
  });
}catch(e){next(e)}});

router.delete('/public/:id/comments/:commentId',requireUser,async(req,res,next)=>{try{
  const item=await Content.findOne(activeFilter(req.params.id));
  if(!item)return res.status(404).json({message:'Post not found or no longer active'});
  if(item.type!=='post')return res.status(400).json({message:'Comments are available for normal posts only'});
  const comment=item.comments.id(req.params.commentId);
  if(!comment)return res.status(404).json({message:'Comment not found'});
  const isCommentOwner=String(comment.userId)===String(req.user.userId);
  const isPostOwner=item.ownerUserId&&String(item.ownerUserId)===String(req.user.userId);
  if(!isCommentOwner&&!isPostOwner)return res.status(403).json({message:'You cannot delete this comment'});
  comment.deleteOne();
  await item.save();
  res.json({ok:true,commentCount:item.comments.length});
}catch(e){next(e)}});

router.post('/public/:id/share',requireUser,async(req,res,next)=>{try{
  const item=await Content.findOneAndUpdate({...activeFilter(req.params.id),type:'post'},{$inc:{shareCount:1}},{new:true});
  if(!item)return res.status(404).json({message:'Post not found or no longer active'});
  res.json({shareCount:Number(item.shareCount||0)});
}catch(e){next(e)}});

router.post('/public/:id/view',requireUser,async(req,res,next)=>{try{
  const item=await Content.findOne(activeFilter(req.params.id));
  if(!item)return res.status(404).json({message:'Story not found or expired'});
  if(item.type!=='status')return res.status(400).json({message:'Views are available for stories only'});
  if(item.ownerUserId&&String(item.ownerUserId)===String(req.user.userId))return res.json({ok:true,viewCount:item.storyViews.length,ownStory:true});
  const existing=item.storyViews.find(view=>String(view.userId)===String(req.user.userId));
  if(existing)existing.viewedAt=new Date();
  else item.storyViews.push({userId:req.user.userId,viewedAt:new Date()});
  await item.save();
  res.json({ok:true,viewCount:item.storyViews.length});
}catch(e){next(e)}});

router.get('/public/:id/views',requireUser,async(req,res,next)=>{try{
  const item=await Content.findOne(activeFilter(req.params.id)).populate('storyViews.userId','name gender profilePhotoUrl village').lean();
  if(!item)return res.status(404).json({message:'Story not found or expired'});
  if(item.type!=='status')return res.status(400).json({message:'Views are available for stories only'});
  if(String(item.ownerUserId)!==String(req.user.userId))return res.status(403).json({message:'Only the story owner can see viewers'});
  const viewers=(item.storyViews||[]).filter(v=>v.userId).sort((a,b)=>new Date(b.viewedAt)-new Date(a.viewedAt)).map(v=>({
    id:String(v.userId._id),name:v.userId.name,gender:v.userId.gender||'other',
    profilePhotoUrl:v.userId.profilePhotoUrl||'',village:v.userId.village||'',viewedAt:v.viewedAt
  }));
  res.json({count:viewers.length,viewers});
}catch(e){next(e)}});

router.get('/user/mine',requireUser,async(req,res,next)=>{try{
  await processExpiredContent().catch(()=>{});
  const items=await Content.find({ownerUserId:req.user.userId,source:'user',userDeletedAt:null}).sort({createdAt:-1}).lean();
  res.json(items);
}catch(e){next(e)}});

router.post('/user',requireUser,async(req,res,next)=>{try{
  const {type,planCode,useActivePass=false,title,description,area,price,mediaUrl,mediaPublicId,mediaType='none',linkUrl,endsAt,meta={}}=req.body||{};
  if(!USER_POST_TYPES.includes(type))return res.status(400).json({message:'This submission type is not available'});
  if(!String(title||'').trim())return res.status(400).json({message:'Title is required'});
  if(!String(description||'').trim())return res.status(400).json({message:'Details are required'});
  if(!String(area||'').trim())return res.status(400).json({message:'Area / Village is required'});
  const missingFields=validateTypeFields(type,meta);
  if(missingFields.length)return res.status(400).json({message:`Please fill required ${type} fields: ${missingFields.join(', ')}`});
  if(['status','banner'].includes(type)&&!mediaUrl)return res.status(400).json({message:type==='status'?'Story photo or video is required':'Banner image is required'});
  let eventEnd=null;
  if(type==='event'){
    eventEnd=endsAt?new Date(endsAt):null;
    if(!eventEnd||Number.isNaN(eventEnd.getTime())||eventEnd<=new Date())return res.status(400).json({message:'Choose a future Event End Date'});
  }

  let plan=null,snapshot=null,free=false,pass=null;
  if(['status','post'].includes(type)){
    const access=await getPublishingAccess(req.user.userId,type);
    if(access.free?.remaining>0){
      plan=await getPostPlan(type,access.free.planCode);
      snapshot=planSnapshot(plan);free=true;
    }else if(useActivePass&&access.activePass){
      pass=await consumeActivePass(req.user.userId,type);
      if(!pass)return res.status(409).json({message:'Your active publishing pack is no longer available. Please refresh and choose a plan.'});
      const parent=await getPostPlan(type,pass.planCode,{allowInactive:true});
      snapshot={...(parent?planSnapshot(parent):{}),billingMode:'active_pass',parentPlanCode:pass.planCode,packValidityDays:null,publishLimit:null};
      plan={code:pass.planCode,label:`Covered by ${pass.planLabel}`,amount:0,durationDays:type==='status'?1:null,mediaMode:parent?.mediaMode||'image-or-video'};
      free=true;
    }else{
      plan=await getPostPlan(type,planCode);
      if(!plan||plan.billingMode==='free_quota')return res.status(400).json({message:'Select a valid paid plan'});
      snapshot=planSnapshot(plan);
    }
  }else{
    plan=await getPostPlan(type,planCode);
    if(!plan)return res.status(400).json({message:'Select a valid plan'});
    snapshot=planSnapshot(plan);
  }

  if(plan.mediaMode==='image'&&mediaUrl&&mediaType==='video')return res.status(400).json({message:'This plan allows images only'});
  if(plan.mediaMode==='video'&&mediaUrl&&mediaType!=='video')return res.status(400).json({message:'This plan allows video only'});
  if(plan.mediaMode==='none'&&mediaUrl)return res.status(400).json({message:'This plan does not allow media'});

  const item=await Content.create({
    type,title:String(title).trim(),description,area,price:price===''||price==null?undefined:Number(price),mediaUrl,mediaPublicId,
    mediaType:mediaUrl?(mediaType==='video'?'video':'image'):'none',linkUrl,endsAt:eventEnd,meta,
    source:'user',ownerUserId:req.user.userId,status:free?'pending':'payment-pending',planCode:plan.code,planLabel:plan.label,
    planAmount:Number(plan.amount||0),planDurationDays:plan.durationDays??null,planSnapshot:snapshot,renewalAllowed:Boolean(snapshot.renewalAllowed),
    renewalGraceDays:Number(snapshot.renewalGraceDays||0),publishingPassId:pass?pass._id:null,
    paymentStatus:free?'paid':'pending',paymentId:free?(pass?`pass:${pass._id}`:'free_quota'):undefined,paidAt:free?new Date():undefined
  });
  await AuditLog.create({actor:`user:${req.user.userId}`,action:'submission.create',entityType:item.type,entityId:item.id,details:{planCode:item.planCode,amount:item.planAmount,billingMode:snapshot.billingMode}});
  res.status(201).json(item);
}catch(e){next(e)}});

router.post('/user/:id/resubmit',requireUser,async(req,res,next)=>{try{
  const item=await Content.findOne({_id:req.params.id,ownerUserId:req.user.userId,source:'user'});
  if(!item)return res.status(404).json({message:'Submission not found'});
  if(item.status!=='changes-required')return res.status(400).json({message:'Only Changes Required submissions can be resubmitted'});
  const allowed=['title','description','area','price','mediaUrl','mediaPublicId','mediaType','linkUrl','endsAt','meta'];
  for(const key of allowed)if(req.body?.[key]!==undefined)item[key]=req.body[key];
  item.status='pending';item.reviewNote='';
  await item.save();
  await AuditLog.create({actor:`user:${req.user.userId}`,action:'submission.resubmit',entityType:item.type,entityId:item.id});
  res.json(item);
}catch(e){next(e)}});


router.post('/user/:id/edit-request',requireUser,async(req,res,next)=>{try{
  const original=await Content.findOne({_id:req.params.id,ownerUserId:req.user.userId,source:'user'});
  if(!original)return res.status(404).json({message:'Listing not found'});
  if(!['shop','worker'].includes(original.type))return res.status(400).json({message:'Edit approval is available for Business and Worker listings only'});
  if(original.status!=='approved')return res.status(400).json({message:'Only live approved listings can be edited'});
  const body=req.body||{};
  const sameMedia=(body.mediaPublicId??original.mediaPublicId)===original.mediaPublicId;
  const nextMeta={...(original.meta||{}),...(body.meta||{}),isEditRequest:true,sharesOriginalMedia:sameMedia};
  const request=await Content.create({
    type:original.type,title:body.title??original.title,description:body.description??original.description,area:body.area??original.area,
    price:body.price??original.price,mediaUrl:body.mediaUrl??original.mediaUrl,mediaPublicId:body.mediaPublicId??original.mediaPublicId,
    mediaType:body.mediaType??original.mediaType,linkUrl:body.linkUrl??original.linkUrl,meta:nextMeta,source:'user',ownerUserId:req.user.userId,
    status:'pending',planCode:original.planCode,planLabel:`Edit request • ${original.planLabel||'One-time listing'}`,planAmount:0,
    planDurationDays:null,planSnapshot:{...(original.planSnapshot||{}),billingMode:'edit_request'},renewalAllowed:false,renewalGraceDays:0,
    editOf:original._id,paymentStatus:'not-required'
  });
  await AuditLog.create({actor:`user:${req.user.userId}`,action:'submission.edit_request',entityType:request.type,entityId:request.id,details:{editOf:String(original._id)}});
  res.status(201).json(request);
}catch(e){next(e)}});

router.delete('/user/:id',requireUser,async(req,res,next)=>{try{
  const item=await Content.findOne({_id:req.params.id,ownerUserId:req.user.userId,source:'user'});
  if(!item)return res.status(404).json({message:'Submission not found'});
  if(item.publishingPassId&&['pending','changes-required','rejected'].includes(item.status))await releasePassSlot(item).catch(()=>{});
  if(item.mediaPublicId&&!item.meta?.sharesOriginalMedia){
    await cloudinary.uploader.destroy(item.mediaPublicId,{resource_type:item.mediaType==='video'?'video':'image'}).catch(()=>{});
  }
  item.userDeletedAt=new Date();
  item.status='expired';
  item.mediaUrl='';item.mediaPublicId='';item.mediaType='none';
  item.reviewNote='Deleted by user';
  await item.save();
  await Content.updateMany({editOf:item._id,status:{$in:['pending','changes-required']}},{$set:{status:'rejected',reviewNote:'Original listing was deleted by user.'}}).catch(()=>{});
  await AuditLog.create({actor:`user:${req.user.userId}`,action:'submission.delete',entityType:item.type,entityId:item.id});
  res.json({ok:true});
}catch(e){next(e)}});

router.post('/user/:id/renew',requireUser,async(req,res,next)=>{try{
  const old=await Content.findOne({_id:req.params.id,ownerUserId:req.user.userId,source:'user'});
  if(!old)return res.status(404).json({message:'Submission not found'});
  if(!old.renewalAllowed||['status','post','shop','worker','event'].includes(old.type))return res.status(400).json({message:'This post type does not support renewal'});
  const now=new Date();
  const threeDaysFromNow=new Date(now.getTime()+3*24*60*60*1000);
  const activeRenewalWindow=old.status==='approved'&&old.expiresAt&&old.expiresAt>now&&old.expiresAt<=threeDaysFromNow;
  const expiredRenewalWindow=old.status==='expired'&&old.renewalGraceUntil&&old.renewalGraceUntil>now;
  if(!activeRenewalWindow&&!expiredRenewalWindow)return res.status(400).json({message:'Renewal is available from 3 days before expiry until the renewal grace period ends'});
  let plan=await getPostPlan(old.type,req.body?.planCode||old.planCode);
  if(!plan)plan=await Plan.findOne({type:old.type,active:true}).sort({sortOrder:1,amount:1}).lean();
  if(!plan)return res.status(400).json({message:'No active renewal plan is available'});
  const snapshot=planSnapshot(plan);
  const free=Number(plan.amount||0)===0;
  const item=await Content.create({
    type:old.type,title:old.title,description:old.description,mediaUrl:old.mediaUrl,mediaPublicId:old.mediaPublicId,mediaType:old.mediaType,
    linkUrl:old.linkUrl,area:old.area,price:old.price,endsAt:old.endsAt,meta:old.meta,source:'user',ownerUserId:req.user.userId,
    status:free?'pending':'payment-pending',planCode:plan.code,planLabel:plan.label,planAmount:plan.amount,planDurationDays:plan.durationDays,
    planSnapshot:snapshot,renewalAllowed:snapshot.renewalAllowed,renewalGraceDays:snapshot.renewalGraceDays,renewalOf:old._id,
    paymentStatus:free?'paid':'pending',paymentId:free?'free_plan':undefined,paidAt:free?new Date():undefined
  });
  old.mediaPublicId='';
  await old.save();
  res.status(201).json(item);
}catch(e){next(e)}});

router.get('/admin/plans',requireAdmin,async(req,res,next)=>{try{
  await ensureDefaultPlans();
  const filter={};if(req.query.type)filter.type=req.query.type;
  res.json(await Plan.find(filter).sort({type:1,sortOrder:1,amount:1}).lean());
}catch(e){next(e)}});
router.post('/admin/plans',requireAdmin,async(req,res,next)=>{try{
  const payload={...req.body};
  if(!USER_POST_TYPES.includes(payload.type))return res.status(400).json({message:'Invalid publish type'});
  payload.code=String(payload.code||'').trim();payload.label=String(payload.label||'').trim();
  if(!payload.code||!payload.label)return res.status(400).json({message:'Plan code and name are required'});
  const row=await Plan.create(payload);res.status(201).json(row);
}catch(e){if(e?.code===11000)return res.status(409).json({message:'Plan code already exists'});next(e)}});
router.patch('/admin/plans/:id',requireAdmin,async(req,res,next)=>{try{
  const row=await Plan.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true});
  if(!row)return res.status(404).json({message:'Plan not found'});res.json(row);
}catch(e){next(e)}});
router.delete('/admin/plans/:id',requireAdmin,async(req,res,next)=>{try{
  const row=await Plan.findById(req.params.id);if(!row)return res.status(404).json({message:'Plan not found'});
  const used=await Content.exists({planCode:row.code});
  if(used){row.active=false;await row.save();return res.json({ok:true,deactivated:true,message:'Plan is already used, so it was disabled instead of deleted.'});}
  await row.deleteOne();res.json({ok:true});
}catch(e){next(e)}});

router.get('/admin',requireAdmin,async(req,res,next)=>{try{
  await processExpiredContent().catch(()=>{});
  const filter={userDeletedAt:null};if(req.query.type)filter.type=req.query.type;if(req.query.source)filter.source=req.query.source;if(req.query.status)filter.status=req.query.status;
  res.json(await Content.find(filter).populate('ownerUserId','name mobile village address gender profilePhotoUrl').sort({createdAt:-1}).lean());
}catch(e){next(e)}});

router.post('/admin/:id/review',requireAdmin,async(req,res,next)=>{try{
  const item=await Content.findById(req.params.id);
  if(!item)return res.status(404).json({message:'Submission not found'});
  if(item.source!=='user')return res.status(400).json({message:'This is not a user submission'});
  const action=req.body?.action;
  const note=String(req.body?.note||'').trim();
  if(action==='approve'){
    if(item.editOf){
      const target=await Content.findOne({_id:item.editOf,ownerUserId:item.ownerUserId,source:'user'});
      if(!target)return res.status(404).json({message:'Original listing for this edit request was not found'});
      const previousPublicId=target.mediaPublicId;const previousMediaType=target.mediaType;
      const editable=['title','description','area','price','mediaUrl','mediaPublicId','mediaType','linkUrl','meta'];
      for(const key of editable)target[key]=item[key];
      target.meta={...(target.meta||{})};delete target.meta.isEditRequest;delete target.meta.sharesOriginalMedia;
      await target.save();
      if(previousPublicId&&previousPublicId!==target.mediaPublicId){
        await cloudinary.uploader.destroy(previousPublicId,{resource_type:previousMediaType==='video'?'video':'image'}).catch(()=>{});
      }
      const now=new Date();
      item.status='applied';item.approvedAt=now;item.reviewNote=note||'Changes approved and applied to the live listing.';
      item.meta={...(item.meta||{}),sharesOriginalMedia:true};
      await Notification.create({userId:item.ownerUserId,type:'approval',title:'Listing changes approved',message:`Your changes to “${target.title}” are now live.`,contentId:target._id,actionUrl:'/my-submissions',uniqueKey:`edit-approved:${item._id}:${now.toISOString()}`}).catch(()=>{});
      await item.save();
      await AuditLog.create({actor:req.admin.username,action:'submission.edit_approved',entityType:item.type,entityId:item.id,details:{editOf:String(target._id),note}});
      return res.json({request:item,updated:target});
    }
    if(item.paymentStatus!=='paid')return res.status(400).json({message:'Payment must be verified before approval'});
    const now=new Date();
    let startAt=now;
    if(item.renewalOf){
      const previous=await Content.findById(item.renewalOf).lean();
      if(previous?.expiresAt&&new Date(previous.expiresAt)>now)startAt=new Date(previous.expiresAt);
    }
    const expiry=computePublishedExpiry(item,startAt);
    if(item.type==='event'&&(!expiry||expiry<=now))return res.status(400).json({message:'Event End Date has already passed'});
    if(item.planSnapshot?.billingMode==='free_quota'&&!item.meta?.freeQuotaCounted&&['status','post'].includes(item.type)){
      await User.updateOne({_id:item.ownerUserId},{$inc:{[`freeApprovedCounts.${item.type}`]:1}});
      item.meta={...(item.meta||{}),freeQuotaCounted:true};
    }
    item.status='approved';item.publishedAt=now;item.approvedAt=now;item.startsAt=startAt;item.expiresAt=expiry;item.renewalGraceUntil=null;item.reviewNote=note;
    await Notification.create({userId:item.ownerUserId,type:'approval',title:'Submission approved',message:`“${item.title}” has been approved${startAt>now?' and is scheduled after your current plan expires.':'.'}`,contentId:item._id,actionUrl:'/my-submissions',uniqueKey:`approval:${item._id}:${now.toISOString()}`}).catch(()=>{});
  }else if(action==='changes-required'){
    item.status='changes-required';item.reviewNote=note||'Please update the submission and resubmit.';
    await Notification.create({userId:item.ownerUserId,type:'changes-required',title:'Changes required',message:item.reviewNote,contentId:item._id,actionUrl:'/my-submissions',uniqueKey:`changes:${item._id}:${Date.now()}`}).catch(()=>{});
  }else if(action==='reject'){
    item.status='rejected';item.reviewNote=note||'Submission rejected by Admin.';
    await Notification.create({userId:item.ownerUserId,type:'rejected',title:'Submission rejected',message:item.reviewNote,contentId:item._id,actionUrl:'/my-submissions',uniqueKey:`rejected:${item._id}:${Date.now()}`}).catch(()=>{});
    if(item.publishingPassId)await releasePassSlot(item).catch(()=>{});
    if(item.paymentStatus==='paid'&&item.paymentId){
      const billingMode=item.planSnapshot?.billingMode;
      if(item.paymentId==='free_quota'||String(item.paymentId).startsWith('pass:')||billingMode==='active_pass'){
        item.paymentStatus='not-required';
      }else if(billingMode==='pack'){
        // The payment purchased a reusable Story/Post pack. Rejecting one submission restores its slot; the pack itself remains active.
        item.reviewNote=`${item.reviewNote} Publishing-pack payment remains active and this publish slot was restored.`.trim();
      }else{
        item.paymentStatus='refund-pending';
        if(String(item.paymentId).startsWith('mock_')){
          item.refundId=`mock_refund_${Date.now()}`;
          item.paymentStatus='refunded';
        }else{
          const client=razorpay();
          if(client){
            try{
              const refund=await client.payments.refund(item.paymentId,{amount:Math.round(Number(item.planAmount||0)*100),notes:{reason:item.reviewNote,submissionId:item.id}});
              item.refundId=refund.id;item.paymentStatus='refunded';
            }catch{
              item.paymentStatus='refund-failed';
            }
          }
        }
      }
    }
  }else return res.status(400).json({message:'Invalid review action'});
  await item.save();
  await AuditLog.create({actor:req.admin.username,action:`submission.${action}`,entityType:item.type,entityId:item.id,details:{note,paymentStatus:item.paymentStatus}});
  res.json(item);
}catch(e){next(e)}});

router.post('/',requireAdmin,async(req,res,next)=>{try{
  const item=await Content.create({...req.body,source:'admin',paymentStatus:'not-required'});
  await AuditLog.create({actor:req.admin.username,action:'content.create',entityType:item.type,entityId:item.id,details:{title:item.title}});res.status(201).json(item);
}catch(e){next(e)}});

router.patch('/:id',requireAdmin,async(req,res,next)=>{try{
  const item=await Content.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true});if(!item)return res.status(404).json({message:'Content not found'});
  await AuditLog.create({actor:req.admin.username,action:'content.update',entityType:item.type,entityId:item.id});res.json(item);
}catch(e){next(e)}});
router.delete('/:id',requireAdmin,async(req,res,next)=>{try{const item=await Content.findByIdAndDelete(req.params.id);if(!item)return res.status(404).json({message:'Content not found'});await AuditLog.create({actor:req.admin.username,action:'content.delete',entityType:item.type,entityId:item.id});res.json({ok:true});}catch(e){next(e)}});
export default router;
