import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Follow from '../models/Follow.js';
import Block from '../models/Block.js';
import { requireUser } from '../middleware/auth.js';

const router=Router();
router.use(requireUser);

async function hasAcceptedRelationship(viewerId,targetId){
  return Boolean(await Follow.exists({status:'accepted',$or:[{followerId:viewerId,followingId:targetId},{followerId:targetId,followingId:viewerId}]}));
}
async function blockedBetween(a,b){
  return Boolean(await Block.exists({$or:[{blockerId:a,blockedId:b},{blockerId:b,blockedId:a}]}));
}

router.get('/profile/:id',async(req,res,next)=>{try{
  if(!mongoose.isValidObjectId(req.params.id))return res.status(404).json({message:'Profile not found'});
  const isSelf=String(req.params.id)===String(req.user.userId);
  const target=await User.findById(req.params.id).select('username allowCalls allowMessages isPrivate status').lean();
  if(!target||target.status!=='active'||(!isSelf&&await blockedBetween(req.user.userId,target._id)))return res.status(404).json({message:'Profile not found'});

  let relationshipAllowed=true;
  if(!isSelf&&target.isPrivate)relationshipAllowed=await hasAcceptedRelationship(req.user.userId,target._id);

  res.json({
    username:target.username||'',
    isPrivate:Boolean(target.isPrivate),
    relationshipAllowed,
    canCall:!isSelf&&relationshipAllowed&&Boolean(target.allowCalls),
    canMessage:!isSelf&&relationshipAllowed&&Boolean(target.allowMessages)
  });
}catch(e){next(e)}});

export default router;
