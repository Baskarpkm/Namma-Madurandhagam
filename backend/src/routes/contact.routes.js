import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { requireUser } from '../middleware/auth.js';

const router=Router();
router.use(requireUser);

router.get('/profile/:id',async(req,res,next)=>{try{
  if(!mongoose.isValidObjectId(req.params.id))return res.status(404).json({message:'Profile not found'});
  const isSelf=String(req.params.id)===String(req.user.userId);
  const target=await User.findById(req.params.id).select('username mobile allowCalls allowMessages status').lean();
  if(!target||target.status!=='active')return res.status(404).json({message:'Profile not found'});

  const canCall=!isSelf&&Boolean(target.allowCalls);
  const canMessage=!isSelf&&Boolean(target.allowMessages);

  res.json({
    username:target.username||'',
    canCall,
    canMessage,
    // The phone number is never rendered as profile text. It is supplied only to the native tel: action when the owner enabled calls.
    callHref:canCall?`tel:+91${String(target.mobile||'').replace(/\D/g,'')}`:''
  });
}catch(e){next(e)}});

export default router;
