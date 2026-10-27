import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Follow from '../models/Follow.js';
import Content from '../models/Content.js';
import Notification from '../models/Notification.js';
import { requireUser } from '../middleware/auth.js';

const router=Router();
router.use(requireUser);

const publicUser=(user)=>({
  id:String(user._id||user.id),
  name:user.name,
  village:user.village||'',
  gender:user.gender||'other',
  profilePhotoUrl:user.profilePhotoUrl||'',
  isPrivate:Boolean(user.isPrivate)
});

const activeContentFilter=(extra={})=>{
  const now=new Date();
  return {
    ...extra,
    status:'approved',
    purgedAt:null,
    userDeletedAt:null,
    $and:[
      {$or:[{expiresAt:null},{expiresAt:{$gt:now}}]},
      {$or:[{startsAt:null},{startsAt:{$lte:now}}]}
    ]
  };
};

async function relationStatus(viewerId,targetId){
  if(String(viewerId)===String(targetId))return 'self';
  const row=await Follow.findOne({followerId:viewerId,followingId:targetId}).select('status').lean();
  return row?.status||'none';
}

async function canViewPrivateContent(viewerId,target){
  if(!target)return false;
  if(String(viewerId)===String(target._id))return true;
  if(!target.isPrivate)return true;
  return Boolean(await Follow.exists({followerId:viewerId,followingId:target._id,status:'accepted'}));
}

async function profileCounts(userId){
  const [followers,following,posts]=await Promise.all([
    Follow.countDocuments({followingId:userId,status:'accepted'}),
    Follow.countDocuments({followerId:userId,status:'accepted'}),
    Content.countDocuments(activeContentFilter({ownerUserId:userId,source:'user',type:'post'}))
  ]);
  return {followers,following,posts};
}

function shapePost(item,target,followStatus,viewerId){
  const likes=Array.isArray(item.likes)?item.likes:[];
  const comments=Array.isArray(item.comments)?item.comments:[];
  const shaped={
    ...item,
    ownerUserId:String(target._id),
    author:{...publicUser(target),followStatus},
    likeCount:likes.length,
    commentCount:comments.length,
    shareCount:Number(item.shareCount||0),
    likedByMe:likes.some(id=>String(id)===String(viewerId))
  };
  delete shaped.likes;
  delete shaped.comments;
  delete shaped.storyViews;
  return shaped;
}

router.get('/me/summary',async(req,res,next)=>{try{
  const user=await User.findById(req.user.userId).select('name village gender profilePhotoUrl isPrivate').lean();
  if(!user)return res.status(404).json({message:'User not found'});
  const [counts,requestCount]=await Promise.all([
    profileCounts(user._id),
    Follow.countDocuments({followingId:user._id,status:'pending'})
  ]);
  res.json({user:publicUser(user),counts,requestCount});
}catch(e){next(e)}});

router.patch('/privacy',async(req,res,next)=>{try{
  const isPrivate=Boolean(req.body?.isPrivate);
  const user=await User.findByIdAndUpdate(req.user.userId,{$set:{isPrivate}},{new:true}).select('name village gender profilePhotoUrl isPrivate').lean();
  if(!user)return res.status(404).json({message:'User not found'});

  if(!isPrivate){
    const pending=await Follow.find({followingId:user._id,status:'pending'}).select('_id followerId').lean();
    if(pending.length){
      await Follow.updateMany({_id:{$in:pending.map(x=>x._id)}},{$set:{status:'accepted'}});
      const ops=pending.map(row=>({
        updateOne:{
          filter:{uniqueKey:`follow-accepted:${row._id}`},
          update:{$setOnInsert:{
            userId:row.followerId,
            type:'follow',
            title:'Follow request accepted',
            message:`${user.name} accepted your follow request.`,
            actionUrl:`/profile/${user._id}`,
            uniqueKey:`follow-accepted:${row._id}`
          }},
          upsert:true
        }
      }));
      await Notification.bulkWrite(ops,{ordered:false}).catch(()=>{});
    }
  }

  res.json({user:publicUser(user)});
}catch(e){next(e)}});

router.get('/profiles/:id',async(req,res,next)=>{try{
  if(!mongoose.isValidObjectId(req.params.id))return res.status(404).json({message:'Profile not found'});
  const user=await User.findById(req.params.id).select('name village gender profilePhotoUrl isPrivate status').lean();
  if(!user||user.status!=='active')return res.status(404).json({message:'Profile not found'});
  const [counts,status,canViewContent]=await Promise.all([
    profileCounts(user._id),
    relationStatus(req.user.userId,user._id),
    canViewPrivateContent(req.user.userId,user)
  ]);
  res.json({user:publicUser(user),counts,followStatus:status,canViewContent});
}catch(e){next(e)}});

router.get('/profiles/:id/posts',async(req,res,next)=>{try{
  if(!mongoose.isValidObjectId(req.params.id))return res.status(404).json({message:'Profile not found'});
  const user=await User.findById(req.params.id).select('name village gender profilePhotoUrl isPrivate status').lean();
  if(!user||user.status!=='active')return res.status(404).json({message:'Profile not found'});
  if(!(await canViewPrivateContent(req.user.userId,user)))return res.status(403).json({message:'This account is private. Follow this user to see their posts.'});
  const [items,status]=await Promise.all([
    Content.find(activeContentFilter({ownerUserId:user._id,source:'user',type:'post'})).sort({publishedAt:-1,createdAt:-1}).lean(),
    relationStatus(req.user.userId,user._id)
  ]);
  res.json(items.map(item=>shapePost(item,user,status,req.user.userId)));
}catch(e){next(e)}});

async function listAccess(req,res){
  if(!mongoose.isValidObjectId(req.params.id)){res.status(404).json({message:'Profile not found'});return null}
  const target=await User.findById(req.params.id).select('name isPrivate status').lean();
  if(!target||target.status!=='active'){res.status(404).json({message:'Profile not found'});return null}
  if(!(await canViewPrivateContent(req.user.userId,target))){res.status(403).json({message:'This account is private.'});return null}
  return target;
}

router.get('/profiles/:id/followers',async(req,res,next)=>{try{
  const target=await listAccess(req,res);if(!target)return;
  const rows=await Follow.find({followingId:target._id,status:'accepted'}).sort({createdAt:-1}).populate('followerId','name village gender profilePhotoUrl isPrivate status').lean();
  res.json({items:rows.filter(r=>r.followerId?.status==='active').map(r=>publicUser(r.followerId))});
}catch(e){next(e)}});

router.get('/profiles/:id/following',async(req,res,next)=>{try{
  const target=await listAccess(req,res);if(!target)return;
  const rows=await Follow.find({followerId:target._id,status:'accepted'}).sort({createdAt:-1}).populate('followingId','name village gender profilePhotoUrl isPrivate status').lean();
  res.json({items:rows.filter(r=>r.followingId?.status==='active').map(r=>publicUser(r.followingId))});
}catch(e){next(e)}});

router.post('/profiles/:id/follow',async(req,res,next)=>{try{
  const targetId=req.params.id;
  if(!mongoose.isValidObjectId(targetId))return res.status(404).json({message:'Profile not found'});
  if(String(targetId)===String(req.user.userId))return res.status(400).json({message:'You cannot follow yourself'});
  const target=await User.findById(targetId).select('name isPrivate status').lean();
  if(!target||target.status!=='active')return res.status(404).json({message:'Profile not found'});
  const actor=await User.findById(req.user.userId).select('name').lean();
  let row=await Follow.findOne({followerId:req.user.userId,followingId:targetId});
  if(row)return res.json({status:row.status});

  const status=target.isPrivate?'pending':'accepted';
  row=await Follow.create({followerId:req.user.userId,followingId:targetId,status});
  const notification=status==='pending'?{
    userId:targetId,type:'follow-request',title:'New follow request',
    message:`${actor?.name||'A user'} requested to follow you.`,actionUrl:'/follow-requests',uniqueKey:`follow-request:${row._id}`
  }:{
    userId:targetId,type:'follow',title:'New follower',
    message:`${actor?.name||'A user'} started following you.`,actionUrl:`/profile/${req.user.userId}`,uniqueKey:`follow:${row._id}`
  };
  await Notification.create(notification).catch(()=>{});
  res.status(201).json({status});
}catch(e){
  if(e?.code===11000){
    const row=await Follow.findOne({followerId:req.user.userId,followingId:req.params.id}).select('status').lean().catch(()=>null);
    if(row)return res.json({status:row.status});
  }
  next(e)
}});

router.delete('/profiles/:id/follow',async(req,res,next)=>{try{
  const row=await Follow.findOneAndDelete({followerId:req.user.userId,followingId:req.params.id});
  if(row?.status==='pending')await Notification.deleteOne({uniqueKey:`follow-request:${row._id}`}).catch(()=>{});
  res.json({status:'none'});
}catch(e){next(e)}});

router.get('/requests',async(req,res,next)=>{try{
  const rows=await Follow.find({followingId:req.user.userId,status:'pending'}).sort({createdAt:-1}).populate('followerId','name village gender profilePhotoUrl isPrivate status').lean();
  res.json({items:rows.filter(r=>r.followerId?.status==='active').map(r=>({requestId:String(r._id),createdAt:r.createdAt,user:publicUser(r.followerId)}))});
}catch(e){next(e)}});

router.post('/requests/:id/accept',async(req,res,next)=>{try{
  if(!mongoose.isValidObjectId(req.params.id))return res.status(404).json({message:'Follow request not found'});
  const row=await Follow.findOne({_id:req.params.id,followingId:req.user.userId,status:'pending'});
  if(!row)return res.status(404).json({message:'Follow request not found'});
  row.status='accepted';await row.save();
  const owner=await User.findById(req.user.userId).select('name').lean();
  await Notification.create({
    userId:row.followerId,type:'follow',title:'Follow request accepted',
    message:`${owner?.name||'This user'} accepted your follow request.`,actionUrl:`/profile/${req.user.userId}`,
    uniqueKey:`follow-accepted:${row._id}`
  }).catch(()=>{});
  await Notification.updateOne({uniqueKey:`follow-request:${row._id}`},{$set:{readAt:new Date()}}).catch(()=>{});
  res.json({ok:true,status:'accepted'});
}catch(e){next(e)}});

router.post('/requests/:id/reject',async(req,res,next)=>{try{
  if(!mongoose.isValidObjectId(req.params.id))return res.status(404).json({message:'Follow request not found'});
  const row=await Follow.findOneAndDelete({_id:req.params.id,followingId:req.user.userId,status:'pending'});
  if(!row)return res.status(404).json({message:'Follow request not found'});
  await Notification.updateOne({uniqueKey:`follow-request:${row._id}`},{$set:{readAt:new Date()}}).catch(()=>{});
  res.json({ok:true,status:'rejected'});
}catch(e){next(e)}});

export default router;
