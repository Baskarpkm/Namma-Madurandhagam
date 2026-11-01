import { Router } from 'express';
import User from '../models/User.js';
import Content from '../models/Content.js';
import ChatMessage from '../models/ChatMessage.js';
import Notification from '../models/Notification.js';
import Follow from '../models/Follow.js';
import PublishingPass from '../models/PublishingPass.js';
import AuditLog from '../models/AuditLog.js';
import { cloudinary } from '../config/cloudinary.js';
import { requireAdmin } from '../middleware/auth.js';
import { processExpiredContent } from '../services/contentLifecycle.js';
import { getPresenceSummary } from '../services/presence.js';

const router=Router();
router.use(requireAdmin);
const DAY=24*60*60*1000;
const KPI_TYPES=['post','shop','offer','banner','job','vehicle','worker','event','status'];
const escapeRegex=value=>String(value||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const makePublicUserId=id=>{
  const hex=String(id||'').replace(/[^0-9a-f]/gi,'');
  const raw=hex.slice(-6)||'0';
  const num=Number.parseInt(raw,16)%1000000;
  return `NMU-${String(Number.isFinite(num)?num:0).padStart(6,'0')}`;
};

router.get('/presence',async(req,res,next)=>{try{
  res.json(await getPresenceSummary());
}catch(e){next(e)}});

router.get('/users',async(req,res,next)=>{try{
  await User.updateMany({status:'suspended',suspendedUntil:{$ne:null,$lte:new Date()}},{$set:{status:'active',statusReason:'',suspendedUntil:null,statusUpdatedAt:new Date()}}).catch(()=>{});
  const now=new Date();
  const filter={};
  const status=String(req.query.status||'').trim();
  if(['active','suspended','banned'].includes(status))filter.status=status;

  const area=String(req.query.area||'').trim();
  if(area){
    const re=new RegExp(escapeRegex(area),'i');
    filter.$or=[{village:re},{address:re}];
  }

  const createdAt={};
  if(req.query.joinedFrom){
    const d=new Date(String(req.query.joinedFrom));
    if(!Number.isNaN(d.getTime()))createdAt.$gte=d;
  }
  if(req.query.joinedTo){
    const d=new Date(String(req.query.joinedTo));
    if(!Number.isNaN(d.getTime())){d.setUTCDate(d.getUTCDate()+1);createdAt.$lt=d;}
  }
  if(Object.keys(createdAt).length)filter.createdAt=createdAt;

  const requiredIdSets=[];
  if(String(req.query.activePaid||'')==='true'){
    const ids=await Content.distinct('ownerUserId',{
      source:'user',ownerUserId:{$ne:null},paymentStatus:'paid',planAmount:{$gt:0},status:'approved',purgedAt:null,userDeletedAt:null,
      $or:[{expiresAt:null},{expiresAt:{$gt:now}}]
    });
    requiredIdSets.push(new Set(ids.map(String)));
  }
  if(String(req.query.withReports||'')==='true'){
    const ids=await Content.distinct('ownerUserId',{
      source:'user',ownerUserId:{$ne:null},userDeletedAt:null,
      $or:[{'meta.reportCount':{$gt:0}},{'meta.reports.0':{$exists:true}}]
    });
    requiredIdSets.push(new Set(ids.map(String)));
  }
  if(requiredIdSets.length){
    let values=[...requiredIdSets[0]];
    for(const set of requiredIdSets.slice(1))values=values.filter(id=>set.has(id));
    filter._id={$in:values};
  }

  const q=String(req.query.q||'').trim();
  const publicIdSearch=/^NMU-/i.test(q);
  if(q&&!publicIdSearch){
    const re=new RegExp(escapeRegex(q),'i');
    const qOr=[{name:re},{username:re},{mobile:re},{village:re},{address:re}];
    if(filter.$or)filter.$and=[{$or:filter.$or},{$or:qOr}],delete filter.$or;
    else filter.$or=qOr;
  }

  let users=await User.find(filter).sort({createdAt:-1}).lean();
  if(publicIdSearch){
    const needle=q.toUpperCase();
    users=users.filter(user=>makePublicUserId(user._id).includes(needle));
  }

  const ids=users.map(x=>x._id);
  if(!ids.length)return res.json([]);
  const [grouped,reportRows,activePaidRows]=await Promise.all([
    Content.aggregate([
      {$match:{ownerUserId:{$in:ids},source:'user',userDeletedAt:null}},
      {$group:{_id:'$ownerUserId',submissions:{$sum:1},paid:{$sum:{$cond:[{$and:[{$eq:['$paymentStatus','paid']},{$gt:[{$ifNull:['$planAmount',0]},0]}]},1,0]}},totalPaid:{$sum:{$cond:[{$and:[{$eq:['$paymentStatus','paid']},{$gt:[{$ifNull:['$planAmount',0]},0]}]},{$ifNull:['$planAmount',0]},0]}}}}
    ]),
    Content.aggregate([
      {$match:{ownerUserId:{$in:ids},source:'user',userDeletedAt:null,$or:[{'meta.reportCount':{$gt:0}},{'meta.reports.0':{$exists:true}}]}},
      {$group:{_id:'$ownerUserId',count:{$sum:{$cond:[{$gt:[{$ifNull:['$meta.reportCount',0]},0]},{$ifNull:['$meta.reportCount',0]},1]}}}}
    ]),
    Content.aggregate([
      {$match:{ownerUserId:{$in:ids},source:'user',paymentStatus:'paid',planAmount:{$gt:0},status:'approved',purgedAt:null,userDeletedAt:null,$or:[{expiresAt:null},{expiresAt:{$gt:now}}]}},
      {$group:{_id:'$ownerUserId',count:{$sum:1}}}
    ])
  ]);
  const map=new Map(grouped.map(x=>[String(x._id),x]));
  const reportMap=new Map(reportRows.map(x=>[String(x._id),x.count]));
  const activeMap=new Map(activePaidRows.map(x=>[String(x._id),x.count]));
  res.json(users.map(user=>({
    ...user,
    publicUserId:makePublicUserId(user._id),
    submissionCount:map.get(String(user._id))?.submissions||0,
    paymentCount:map.get(String(user._id))?.paid||0,
    totalPaid:map.get(String(user._id))?.totalPaid||0,
    reportCount:reportMap.get(String(user._id))||0,
    activePaidCount:activeMap.get(String(user._id))||0
  })));
}catch(e){next(e)}});

router.get('/users/:id',async(req,res,next)=>{try{
  const user=await User.findById(req.params.id).lean();
  if(!user)return res.status(404).json({message:'User not found'});
  const submissions=await Content.find({ownerUserId:user._id,source:'user',userDeletedAt:null}).sort({createdAt:-1}).lean();
  const paid=submissions.filter(x=>x.paymentStatus==='paid'||x.paymentStatus==='refunded'||x.paymentStatus==='refund-pending'||x.paymentStatus==='refund-failed');
  const now=new Date();
  const summary={
    submissions:submissions.length,
    live:submissions.filter(x=>x.status==='approved'&&(!x.expiresAt||new Date(x.expiresAt)>now)).length,
    expired:submissions.filter(x=>x.status==='expired').length,
    payments:paid.length,
    totalPaid:paid.filter(x=>x.paymentStatus==='paid').reduce((n,x)=>n+Number(x.planAmount||0),0),
    activePaid:submissions.filter(x=>x.paymentStatus==='paid'&&Number(x.planAmount||0)>0&&x.status==='approved'&&(!x.expiresAt||new Date(x.expiresAt)>now)).length,
    reports:submissions.reduce((n,x)=>n+Number(x.meta?.reportCount||((Array.isArray(x.meta?.reports)&&x.meta.reports.length)||0)),0)
  };
  res.json({user:{...user,publicUserId:makePublicUserId(user._id)},summary,submissions});
}catch(e){next(e)}});

router.patch('/users/:id',async(req,res,next)=>{try{
  const status=String(req.body?.status||'');
  if(!['active','suspended','banned'].includes(status))return res.status(400).json({message:'Choose a valid account status'});
  const reason=String(req.body?.reason||'').trim();
  const allowed={status,statusUpdatedAt:new Date()};

  if(status==='active'){
    allowed.statusReason='';
    allowed.suspendedUntil=null;
  }else if(status==='suspended'){
    const rawDays=Number(req.body?.durationDays);
    if(!reason)return res.status(400).json({message:'Suspension reason is required'});
    if(!Number.isFinite(rawDays)||rawDays<1)return res.status(400).json({message:'Suspension duration is required'});
    const days=Math.min(3650,Math.floor(rawDays));
    allowed.statusReason=reason;
    allowed.suspendedUntil=new Date(Date.now()+days*DAY);
  }else{
    if(!reason)return res.status(400).json({message:'Ban reason is required'});
    allowed.statusReason=reason;
    allowed.suspendedUntil=null;
  }

  const user=await User.findByIdAndUpdate(req.params.id,{$set:allowed},{new:true});
  if(!user)return res.status(404).json({message:'User not found'});
  res.json(user);
}catch(e){next(e)}});

router.delete('/users/:id',async(req,res,next)=>{try{
  if(String(req.body?.confirm||'').trim().toUpperCase()!=='DELETE'){
    return res.status(400).json({message:'Type DELETE to permanently remove this user'});
  }
  const user=await User.findById(req.params.id).lean();
  if(!user)return res.status(404).json({message:'User not found'});

  const owned=await Content.find({ownerUserId:user._id}).select('_id mediaPublicId mediaType meta').lean();
  const contentIds=owned.map(x=>x._id);
  const followRows=await Follow.find({$or:[{followerId:user._id},{followingId:user._id}]}).select('_id').lean();
  const followNotificationKeys=followRows.flatMap(row=>[`follow-request:${row._id}`,`follow:${row._id}`,`follow-accepted:${row._id}`]);
  const assets=[];
  if(user.profilePhotoPublicId)assets.push({publicId:user.profilePhotoPublicId,type:'image'});
  for(const item of owned){
    if(item.mediaPublicId)assets.push({publicId:item.mediaPublicId,type:item.mediaType==='video'?'video':'image'});
    for(const media of Array.isArray(item.meta?.mediaItems)?item.meta.mediaItems:[]){
      const publicId=String(media?.publicId||media?.mediaPublicId||'').trim();
      if(publicId)assets.push({publicId,type:media?.type==='video'||media?.mediaType==='video'?'video':'image'});
    }
  }

  const [contentResult,notificationResult,followResult,chatResult,passResult]=await Promise.all([
    Content.deleteMany({ownerUserId:user._id}),
    Notification.deleteMany({$or:[{userId:user._id},{contentId:{$in:contentIds}},{uniqueKey:{$in:followNotificationKeys}}]}),
    Follow.deleteMany({$or:[{followerId:user._id},{followingId:user._id}]}),
    ChatMessage.deleteMany({$or:[{userId:user._id},{senderUserId:user._id},{receiverUserId:user._id}]}),
    PublishingPass.deleteMany({userId:user._id})
  ]);

  // Remove this user's social traces from posts owned by other users.
  await Content.updateMany({},{$pull:{likes:user._id,comments:{userId:user._id},storyViews:{userId:user._id}}});
  await User.deleteOne({_id:user._id});

  // Keep an admin audit record, but no deleted user's content/payment/submission documents.
  await AuditLog.create({
    actor:`admin:${req.admin?.username||req.admin?.sub||'admin'}`,
    action:'user.delete',entityType:'user',entityId:String(user._id),
    details:{
      publicUserId:makePublicUserId(user._id),name:user.name,mobile:user.mobile,
      deletedContent:contentResult.deletedCount||0,
      deletedNotifications:notificationResult.deletedCount||0,
      deletedFollows:followResult.deletedCount||0,
      deletedChats:chatResult.deletedCount||0,
      deletedPublishingPasses:passResult.deletedCount||0
    }
  }).catch(()=>{});

  // Cloudinary cleanup is best-effort and does not block database account removal.
  const uniqueAssets=[...new Map(assets.filter(x=>x.publicId).map(x=>[`${x.type}:${x.publicId}`,x])).values()];
  const mediaCleanup=await Promise.allSettled(uniqueAssets.map(asset=>
    cloudinary.uploader.destroy(asset.publicId,{resource_type:asset.type,invalidate:true})
  ));
  const mediaDeleted=mediaCleanup.filter(x=>x.status==='fulfilled').length;

  res.json({
    ok:true,message:'User and all linked app data deleted permanently.',
    deleted:{
      user:1,content:contentResult.deletedCount||0,notifications:notificationResult.deletedCount||0,
      follows:followResult.deletedCount||0,chats:chatResult.deletedCount||0,publishingPasses:passResult.deletedCount||0,
      cloudinaryAssetsAttempted:uniqueAssets.length,cloudinaryAssetsCompleted:mediaDeleted
    }
  });
}catch(e){next(e)}});

router.get('/payments',async(req,res,next)=>{try{
  const filter={source:'user',paymentStatus:{$ne:'not-required'},planAmount:{$gt:0}};
  if(req.query.type)filter.type=req.query.type;
  if(req.query.status)filter.paymentStatus=req.query.status;
  const rows=await Content.find(filter).populate('ownerUserId','name mobile village gender profilePhotoUrl').sort({createdAt:-1}).lean();
  res.json(rows);
}catch(e){next(e)}});

router.get('/expiry-alerts',async(req,res,next)=>{try{
  await processExpiredContent().catch(()=>{});
  const days=Math.min(30,Math.max(1,Number(req.query.days||3)));
  const now=new Date(),until=new Date(now.getTime()+days*DAY);
  const filter={status:'approved',renewalAllowed:true,expiresAt:{$gt:now,$lte:until},purgedAt:null,userDeletedAt:null};
  if(req.query.type)filter.type=req.query.type;
  const rows=await Content.find(filter).populate('ownerUserId','name mobile village gender profilePhotoUrl').sort({expiresAt:1}).lean();
  res.json(rows.map(x=>({...x,daysLeft:Math.max(1,Math.ceil((new Date(x.expiresAt)-now)/DAY))})));
}catch(e){next(e)}});

router.get('/renewal-grace',async(req,res,next)=>{try{
  await processExpiredContent().catch(()=>{});
  const now=new Date();
  const filter={status:'expired',renewalAllowed:true,renewalGraceUntil:{$gt:now},purgedAt:null,userDeletedAt:null};
  if(req.query.type)filter.type=req.query.type;
  const rows=await Content.find(filter).populate('ownerUserId','name mobile village gender profilePhotoUrl').sort({renewalGraceUntil:1}).lean();
  res.json(rows.map(x=>({...x,graceDaysLeft:Math.max(1,Math.ceil((new Date(x.renewalGraceUntil)-now)/DAY))})));
}catch(e){next(e)}});

router.get('/analytics',async(req,res,next)=>{try{
  await processExpiredContent().catch(()=>{});
  const now=new Date();
  const since30=new Date(now.getTime()-30*DAY);
  const contentBase={purgedAt:null,userDeletedAt:null};
  const paidMatch={source:'user',paymentStatus:'paid',planAmount:{$gt:0},paidAt:{$ne:null}};

  const [revenueSummary,revenueByType,revenueByPlan,dailyRevenue,engagement,statusRows,userStatusRows]=await Promise.all([
    Content.aggregate([{$match:paidMatch},{$group:{_id:null,revenue:{$sum:'$planAmount'},payments:{$sum:1}}}]),
    Content.aggregate([{$match:paidMatch},{$group:{_id:'$type',revenue:{$sum:'$planAmount'},payments:{$sum:1}}},{$sort:{revenue:-1}}]),
    Content.aggregate([{$match:paidMatch},{$group:{_id:{type:'$type',code:'$planCode',label:'$planLabel'},revenue:{$sum:'$planAmount'},payments:{$sum:1}}},{$sort:{revenue:-1}}]),
    Content.aggregate([{$match:{...paidMatch,paidAt:{$gte:since30}}},{$group:{_id:{$dateToString:{format:'%Y-%m-%d',date:'$paidAt'}},revenue:{$sum:'$planAmount'},payments:{$sum:1}}},{$sort:{_id:1}}]),
    Content.aggregate([{$match:contentBase},{$group:{
      _id:null,
      storyViews:{$sum:{$size:{$ifNull:['$storyViews',[]]}}},
      likes:{$sum:{$size:{$ifNull:['$likes',[]]}}},
      comments:{$sum:{$size:{$ifNull:['$comments',[]]}}},
      shares:{$sum:{$ifNull:['$shareCount',0]}},
      impressions:{$sum:{$ifNull:['$meta.impressions',{$ifNull:['$meta.analytics.impressions',0]}]}},
      clicks:{$sum:{$ifNull:['$meta.clicks',{$ifNull:['$meta.analytics.clicks',0]}]}}
    }}]),
    Content.aggregate([{$match:contentBase},{$group:{_id:{type:'$type',status:'$status'},count:{$sum:1}}}]),
    User.aggregate([{$group:{_id:'$status',count:{$sum:1}}}])
  ]);

  const byType={};
  for(const row of statusRows){
    if(!byType[row._id.type])byType[row._id.type]={total:0,approved:0,pending:0,expired:0,rejected:0,changesRequired:0,paymentPending:0};
    const bucket=byType[row._id.type];
    bucket.total+=row.count;
    if(row._id.status==='approved')bucket.approved+=row.count;
    if(row._id.status==='pending')bucket.pending+=row.count;
    if(row._id.status==='expired')bucket.expired+=row.count;
    if(row._id.status==='rejected')bucket.rejected+=row.count;
    if(row._id.status==='changes-required')bucket.changesRequired+=row.count;
    if(row._id.status==='payment-pending')bucket.paymentPending+=row.count;
  }
  const userStatuses={active:0,suspended:0,banned:0};
  userStatusRows.forEach(x=>{if(x._id in userStatuses)userStatuses[x._id]=x.count});
  const e=engagement[0]||{storyViews:0,likes:0,comments:0,shares:0,impressions:0,clicks:0};
  const impressions=Number(e.impressions||0),clicks=Number(e.clicks||0);
  res.json({
    summary:{revenue:Number(revenueSummary[0]?.revenue||0),payments:Number(revenueSummary[0]?.payments||0),...e,ctr:impressions?Number(((clicks/impressions)*100).toFixed(2)):0},
    revenueByType:revenueByType.map(x=>({type:x._id,revenue:x.revenue,payments:x.payments})),
    revenueByPlan:revenueByPlan.map(x=>({type:x._id.type,code:x._id.code||'',label:x._id.label||x._id.code||'Plan',revenue:x.revenue,payments:x.payments})),
    dailyRevenue:dailyRevenue.map(x=>({date:x._id,revenue:x.revenue,payments:x.payments})),
    contentByType:byType,
    userStatuses
  });
}catch(e){next(e)}});

router.get('/stats',async(req,res,next)=>{try{
  await processExpiredContent().catch(()=>{});
  const now=new Date(),soon=new Date(now.getTime()+3*DAY);
  const baseCounts=await Promise.all([
    User.countDocuments(),Content.countDocuments({purgedAt:null,userDeletedAt:null}),ChatMessage.distinct('userId'),
    Content.countDocuments({source:'user',status:'pending',userDeletedAt:null}),Content.countDocuments({source:'user',status:'payment-pending',userDeletedAt:null}),
    Content.countDocuments({status:'approved',renewalAllowed:true,expiresAt:{$gt:now,$lte:soon},purgedAt:null,userDeletedAt:null}),
    Content.countDocuments({status:'expired',renewalAllowed:true,renewalGraceUntil:{$gt:now},purgedAt:null,userDeletedAt:null})
  ]);
  const typeRows=await Content.aggregate([{$match:{type:{$in:KPI_TYPES},purgedAt:null,userDeletedAt:null}},{$group:{_id:'$type',count:{$sum:1}}}]);
  const liveRows=await Content.aggregate([{$match:{type:{$in:KPI_TYPES},status:'approved',purgedAt:null,userDeletedAt:null,$and:[{$or:[{expiresAt:null},{expiresAt:{$gt:now}}]},{$or:[{startsAt:null},{startsAt:{$lte:now}}]}]}},{$group:{_id:'$type',count:{$sum:1}}}]);
  const typeCounts=Object.fromEntries(KPI_TYPES.map(t=>[t,0]));
  const liveCounts=Object.fromEntries(KPI_TYPES.map(t=>[t,0]));
  typeRows.forEach(x=>typeCounts[x._id]=x.count);liveRows.forEach(x=>liveCounts[x._id]=x.count);
  res.json({users:baseCounts[0],listings:baseCounts[1],messages:baseCounts[2].filter(Boolean).length,conversations:baseCounts[2].filter(Boolean).length,pending:baseCounts[3],paymentPending:baseCounts[4],expiringSoon:baseCounts[5],renewalGrace:baseCounts[6],typeCounts,liveCounts});
}catch(e){next(e)}});

export default router;
