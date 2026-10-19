import { Router } from 'express';
import User from '../models/User.js';
import Content from '../models/Content.js';
import ChatMessage from '../models/ChatMessage.js';
import { requireAdmin } from '../middleware/auth.js';
import { processExpiredContent } from '../services/contentLifecycle.js';

const router=Router();
router.use(requireAdmin);
const DAY=24*60*60*1000;
const KPI_TYPES=['post','shop','offer','banner','job','vehicle','worker','event','status'];

router.get('/users',async(req,res,next)=>{try{
  const users=await User.find().sort({createdAt:-1}).lean();
  const ids=users.map(x=>x._id);
  const grouped=await Content.aggregate([
    {$match:{ownerUserId:{$in:ids},source:'user',userDeletedAt:null}},
    {$group:{_id:'$ownerUserId',submissions:{$sum:1},paid:{$sum:{$cond:[{$and:[{$eq:['$paymentStatus','paid']},{$gt:[{$ifNull:['$planAmount',0]},0]}]},1,0]}},totalPaid:{$sum:{$cond:[{$and:[{$eq:['$paymentStatus','paid']},{$gt:[{$ifNull:['$planAmount',0]},0]}]},{$ifNull:['$planAmount',0]},0]}}}}
  ]);
  const map=new Map(grouped.map(x=>[String(x._id),x]));
  res.json(users.map(user=>({...user,submissionCount:map.get(String(user._id))?.submissions||0,paymentCount:map.get(String(user._id))?.paid||0,totalPaid:map.get(String(user._id))?.totalPaid||0})));
}catch(e){next(e)}});

router.get('/users/:id',async(req,res,next)=>{try{
  const user=await User.findById(req.params.id).lean();
  if(!user)return res.status(404).json({message:'User not found'});
  const submissions=await Content.find({ownerUserId:user._id,source:'user',userDeletedAt:null}).sort({createdAt:-1}).lean();
  const paid=submissions.filter(x=>x.paymentStatus==='paid'||x.paymentStatus==='refunded'||x.paymentStatus==='refund-pending'||x.paymentStatus==='refund-failed');
  const summary={
    submissions:submissions.length,
    live:submissions.filter(x=>x.status==='approved'&&(!x.expiresAt||new Date(x.expiresAt)>new Date())).length,
    expired:submissions.filter(x=>x.status==='expired').length,
    payments:paid.length,
    totalPaid:paid.filter(x=>x.paymentStatus==='paid').reduce((n,x)=>n+Number(x.planAmount||0),0)
  };
  res.json({user,summary,submissions});
}catch(e){next(e)}});

router.patch('/users/:id',async(req,res,next)=>{try{
  const allowed={};
  if(['active','suspended','banned'].includes(req.body?.status))allowed.status=req.body.status;
  const user=await User.findByIdAndUpdate(req.params.id,allowed,{new:true});
  if(!user)return res.status(404).json({message:'User not found'});
  res.json(user);
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

router.get('/stats',async(req,res,next)=>{try{
  await processExpiredContent().catch(()=>{});
  const now=new Date(),soon=new Date(now.getTime()+3*DAY);
  const baseCounts=await Promise.all([
    User.countDocuments(),Content.countDocuments({purgedAt:null,userDeletedAt:null}),ChatMessage.distinct('userId'),
    Content.countDocuments({source:'user',status:'pending',userDeletedAt:null}),Content.countDocuments({source:'user',status:'payment-pending',userDeletedAt:null}),
    Content.countDocuments({status:'approved',renewalAllowed:true,expiresAt:{$gt:now,$lte:soon},purgedAt:null,userDeletedAt:null})
  ]);
  const typeRows=await Content.aggregate([{$match:{type:{$in:KPI_TYPES},purgedAt:null,userDeletedAt:null}},{$group:{_id:'$type',count:{$sum:1}}}]);
  const liveRows=await Content.aggregate([{$match:{type:{$in:KPI_TYPES},status:'approved',purgedAt:null,userDeletedAt:null,$and:[{$or:[{expiresAt:null},{expiresAt:{$gt:now}}]},{$or:[{startsAt:null},{startsAt:{$lte:now}}]}]}},{$group:{_id:'$type',count:{$sum:1}}}]);
  const typeCounts=Object.fromEntries(KPI_TYPES.map(t=>[t,0]));
  const liveCounts=Object.fromEntries(KPI_TYPES.map(t=>[t,0]));
  typeRows.forEach(x=>typeCounts[x._id]=x.count);liveRows.forEach(x=>liveCounts[x._id]=x.count);
  res.json({users:baseCounts[0],listings:baseCounts[1],messages:baseCounts[2].filter(Boolean).length,conversations:baseCounts[2].filter(Boolean).length,pending:baseCounts[3],paymentPending:baseCounts[4],expiringSoon:baseCounts[5],typeCounts,liveCounts});
}catch(e){next(e)}});

export default router;
