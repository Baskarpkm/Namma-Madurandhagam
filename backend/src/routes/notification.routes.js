import { Router } from 'express';
import Notification from '../models/Notification.js';
import { requireUser } from '../middleware/auth.js';
import { createExpiryNotifications } from '../services/contentLifecycle.js';

const router=Router();
router.use(requireUser);
router.get('/',async(req,res,next)=>{try{
  await createExpiryNotifications({days:3}).catch(()=>{});
  const rows=await Notification.find({userId:req.user.userId}).sort({createdAt:-1}).limit(100).lean();
  res.json(rows);
}catch(e){next(e)}});
router.patch('/:id/read',async(req,res,next)=>{try{
  const row=await Notification.findOneAndUpdate({_id:req.params.id,userId:req.user.userId},{readAt:new Date()},{new:true});
  if(!row)return res.status(404).json({message:'Notification not found'});
  res.json(row);
}catch(e){next(e)}});
router.post('/read-all',async(req,res,next)=>{try{
  await Notification.updateMany({userId:req.user.userId,readAt:null},{readAt:new Date()});
  res.json({ok:true});
}catch(e){next(e)}});
export default router;
