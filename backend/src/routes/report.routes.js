import { Router } from 'express';
import Report from '../models/Report.js';
import Content from '../models/Content.js';
import { requireAdmin, requireUser } from '../middleware/auth.js';

const router=Router();

router.post('/post/:id',requireUser,async(req,res,next)=>{try{
  const item=await Content.findOne({_id:req.params.id,type:'post',status:'approved',userDeletedAt:null}).select('_id ownerUserId');
  if(!item)return res.status(404).json({message:'Post not found'});
  if(String(item.ownerUserId||'')===String(req.user.userId))return res.status(400).json({message:'You cannot report your own post'});
  const reason=String(req.body?.reason||'other');
  const allowed=['spam','false-information','harassment','inappropriate','scam','other'];
  if(!allowed.includes(reason))return res.status(400).json({message:'Choose a valid report reason'});
  const row=await Report.findOneAndUpdate(
    {reporterId:req.user.userId,contentId:item._id},
    {$set:{reason,details:String(req.body?.details||'').trim(),status:'open',ownerUserId:item.ownerUserId,reviewedAt:null,adminNote:''}},
    {upsert:true,new:true,setDefaultsOnInsert:true}
  );
  res.status(201).json({ok:true,reportId:String(row._id),message:'Report submitted to admin.'});
}catch(e){next(e)}});

router.get('/admin',requireAdmin,async(req,res,next)=>{try{
  const filter={};if(req.query.status)filter.status=req.query.status;
  const rows=await Report.find(filter).sort({createdAt:-1})
    .populate('reporterId','name username profilePhotoUrl mobileLast4')
    .populate('ownerUserId','name username profilePhotoUrl mobileLast4')
    .populate('contentId','title description mediaUrl mediaType status ownerUserId')
    .lean();
  res.json(rows);
}catch(e){next(e)}});

router.patch('/admin/:id',requireAdmin,async(req,res,next)=>{try{
  const status=String(req.body?.status||'reviewed');
  if(!['reviewed','dismissed','removed'].includes(status))return res.status(400).json({message:'Invalid report status'});
  const row=await Report.findById(req.params.id);
  if(!row)return res.status(404).json({message:'Report not found'});
  row.status=status;row.adminNote=String(req.body?.adminNote||'').trim();row.reviewedAt=new Date();await row.save();
  if(status==='removed')await Content.findByIdAndUpdate(row.contentId,{$set:{status:'expired',reviewNote:'Removed after user report review',userDeletedAt:new Date()}});
  res.json({ok:true,status:row.status});
}catch(e){next(e)}});

export default router;
