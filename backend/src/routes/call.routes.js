import { Router } from 'express';
import mongoose from 'mongoose';
import CallSession from '../models/CallSession.js';
import User from '../models/User.js';
import Follow from '../models/Follow.js';
import Block from '../models/Block.js';
import { requireUser } from '../middleware/auth.js';

const router=Router();
router.use(requireUser);

const publicUser=u=>u?{id:String(u._id),name:u.name,username:u.username||'',profilePhotoUrl:u.profilePhotoUrl||'',gender:u.gender||'other'}:null;

async function blocked(a,b){
  return Boolean(await Block.exists({$or:[{blockerId:a,blockedId:b},{blockerId:b,blockedId:a}]}));
}
async function acceptedRelationship(a,b){
  return Boolean(await Follow.exists({status:'accepted',$or:[{followerId:a,followingId:b},{followerId:b,followingId:a}]}));
}
async function loadCall(id,me){
  if(!mongoose.isValidObjectId(id))return null;
  return CallSession.findOne({_id:id,$or:[{callerId:me},{receiverId:me}]}).populate('callerId','name username profilePhotoUrl gender').populate('receiverId','name username profilePhotoUrl gender');
}
function shape(row,me){
  const caller=row.callerId?._id?row.callerId:null,receiver=row.receiverId?._id?row.receiverId:null;
  const callerId = String(caller?._id ?? row.callerId);
  const receiverId = String(receiver?._id ?? row.receiverId);
  return {
    id:String(row._id),status:row.status,createdAt:row.createdAt,answeredAt:row.answeredAt,endedAt:row.endedAt,
    durationSeconds:Number(row.durationSeconds||0),
    isCaller:callerId===String(me),
    caller:publicUser(caller),receiver:publicUser(receiver),
    offer:row.offer||null,answer:row.answer||null,
    callerCandidates:row.callerCandidates||[],receiverCandidates:row.receiverCandidates||[]
  };
}

router.post('/start/:targetId',async(req,res,next)=>{try{
  const me=req.user.userId,targetId=req.params.targetId;
  if(!mongoose.isValidObjectId(targetId)||String(targetId)===String(me))return res.status(400).json({message:'Invalid call target'});
  const target=await User.findById(targetId).select('name username profilePhotoUrl gender status isPrivate allowCalls').lean();
  if(!target||target.status!=='active')return res.status(404).json({message:'User not found'});
  if(await blocked(me,targetId))return res.status(403).json({message:'You cannot call this user because one of you has blocked the other.'});
  if(!target.allowCalls)return res.status(403).json({message:'This user has disabled calls.'});
  if(target.isPrivate&&!(await acceptedRelationship(me,targetId)))return res.status(403).json({message:'Private accounts accept calls only from followers/following.'});

  await CallSession.updateMany({callerId:me,status:'ringing',createdAt:{$lt:new Date(Date.now()-60_000)}},{$set:{status:'missed',endedAt:new Date()}});
  const row=await CallSession.create({callerId:me,receiverId:targetId,status:'ringing'});
  const full=await loadCall(row._id,me);
  res.status(201).json(shape(full,me));
}catch(e){next(e)}});

router.get('/incoming',async(req,res,next)=>{try{
  const row=await CallSession.findOne({receiverId:req.user.userId,status:'ringing',createdAt:{$gte:new Date(Date.now()-60_000)}}).sort({createdAt:-1}).populate('callerId','name username profilePhotoUrl gender').populate('receiverId','name username profilePhotoUrl gender');
  if(!row)return res.json({call:null});
  if(await blocked(row.callerId?._id||row.callerId,req.user.userId)){row.status='declined';row.endedAt=new Date();await row.save();return res.json({call:null});}
  res.json({call:shape(row,req.user.userId)});
}catch(e){next(e)}});

router.get('/history',async(req,res,next)=>{try{
  const me=req.user.userId;
  const [rows,blockRows]=await Promise.all([
    CallSession.find({$or:[{callerId:me},{receiverId:me}]}).sort({createdAt:-1}).limit(100).populate('callerId','name username profilePhotoUrl gender').populate('receiverId','name username profilePhotoUrl gender').lean(),
    Block.find({$or:[{blockerId:me},{blockedId:me}]}).select('blockerId blockedId').lean()
  ]);
  const hidden=new Set(blockRows.map(r=>String(r.blockerId)===String(me)?String(r.blockedId):String(r.blockerId)));
  res.json(rows.filter(r=>{
    const other=String(r.callerId?._id||r.callerId)===String(me)?String(r.receiverId?._id||r.receiverId):String(r.callerId?._id||r.callerId);
    return !hidden.has(other);
  }).map(r=>shape(r,me)));
}catch(e){next(e)}});

router.get('/:id',async(req,res,next)=>{try{
  const row=await loadCall(req.params.id,req.user.userId);
  if(!row)return res.status(404).json({message:'Call not found'});
  res.json(shape(row,req.user.userId));
}catch(e){next(e)}});

router.post('/:id/offer',async(req,res,next)=>{try{
  const row=await CallSession.findOne({_id:req.params.id,callerId:req.user.userId,status:'ringing'});
  if(!row)return res.status(404).json({message:'Call not available'});
  row.offer=req.body?.offer||null;await row.save();res.json({ok:true});
}catch(e){next(e)}});

router.post('/:id/answer',async(req,res,next)=>{try{
  const row=await CallSession.findOne({_id:req.params.id,receiverId:req.user.userId,status:'ringing'});
  if(!row)return res.status(404).json({message:'Call not available'});
  if(await blocked(row.callerId,row.receiverId))return res.status(403).json({message:'Call is blocked'});
  row.answer=req.body?.answer||null;row.status='accepted';row.answeredAt=new Date();await row.save();res.json({ok:true});
}catch(e){next(e)}});

router.post('/:id/candidate',async(req,res,next)=>{try{
  const row=await CallSession.findOne({_id:req.params.id,$or:[{callerId:req.user.userId},{receiverId:req.user.userId}]});
  if(!row)return res.status(404).json({message:'Call not found'});
  const candidate=req.body?.candidate;if(!candidate)return res.status(400).json({message:'Candidate required'});
  if(String(row.callerId)===String(req.user.userId))row.callerCandidates.push(candidate);else row.receiverCandidates.push(candidate);
  if(row.callerCandidates.length>100)row.callerCandidates=row.callerCandidates.slice(-100);
  if(row.receiverCandidates.length>100)row.receiverCandidates=row.receiverCandidates.slice(-100);
  await row.save();res.json({ok:true});
}catch(e){next(e)}});

async function finish(req,res,next,status){try{
  const row=await CallSession.findOne({_id:req.params.id,$or:[{callerId:req.user.userId},{receiverId:req.user.userId}]});
  if(!row)return res.status(404).json({message:'Call not found'});
  if(['ended','declined','cancelled','missed'].includes(row.status))return res.json({ok:true,status:row.status});
  const now=new Date();
  if(status==='declined'&&String(row.receiverId)!==String(req.user.userId))return res.status(403).json({message:'Only receiver can decline'});
  row.status=status;row.endedAt=now;
  if(row.answeredAt)row.durationSeconds=Math.max(0,Math.floor((now-new Date(row.answeredAt))/1000));
  await row.save();res.json({ok:true,status:row.status,durationSeconds:row.durationSeconds});
}catch(e){next(e)}}
router.post('/:id/decline',(req,res,next)=>finish(req,res,next,'declined'));
router.post('/:id/cancel',(req,res,next)=>finish(req,res,next,'cancelled'));
router.post('/:id/end',(req,res,next)=>finish(req,res,next,'ended'));

export default router;
