import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Follow from '../models/Follow.js';
import { requireUser } from '../middleware/auth.js';

const router=Router();
router.use(requireUser);

async function hasAcceptedRelationship(viewerId,targetId){
  return Boolean(await Follow.exists({
    status:'accepted',
    $or:[
      {followerId:viewerId,followingId:targetId},
      {followerId:targetId,followingId:viewerId}
    ]
  }));
}

router.get('/profile/:id',async(req,res,next)=>{try{
  if(!mongoose.isValidObjectId(req.params.id))return res.status(404).json({message:'Profile not found'});
  const isSelf=String(req.params.id)===String(req.user.userId);
  const target=await User.findById(req.params.id).select('username mobile allowCalls allowMessages isPrivate status').lean();
  if(!target||target.status!=='active')return res.status(404).json({message:'Profile not found'});

  let relationshipAllowed=true;
  if(!isSelf&&target.isPrivate){
    relationshipAllowed=await hasAcceptedRelationship(req.user.userId,target._id);
  }

  const canCall=!isSelf&&relationshipAllowed&&Boolean(target.allowCalls);
  const canMessage=!isSelf&&relationshipAllowed&&Boolean(target.allowMessages);

  res.json({
    username:target.username||'',
    isPrivate:Boolean(target.isPrivate),
    relationshipAllowed,
    canCall,
    canMessage,
    // Phone number is never rendered as text; it is exposed only to the native tel: action when contact is allowed.
    callHref:canCall?`tel:+91${String(target.mobile||'').replace(/\D/g,'')}`:''
  });
}catch(e){next(e)}});

export default router;
