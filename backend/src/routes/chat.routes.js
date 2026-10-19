import { Router } from 'express';
import ChatMessage from '../models/ChatMessage.js';
import { requireAdmin, requireUser } from '../middleware/auth.js';

const router=Router();

router.get('/user',requireUser,async(req,res,next)=>{
  try{
    const rows=await ChatMessage.find({userId:req.user.userId}).sort({createdAt:1}).lean();
    res.json(rows);
  }catch(e){next(e)}
});

router.post('/user',requireUser,async(req,res,next)=>{
  try{
    const {message,mediaUrl,mediaType='none'}=req.body||{};
    if(!message&&!mediaUrl)return res.status(400).json({message:'Message or media is required'});
    const msg=await ChatMessage.create({userId:req.user.userId,sender:'user',message,mediaUrl,mediaType});
    res.status(201).json(msg);
  }catch(e){next(e)}
});

router.get('/admin',requireAdmin,async(req,res,next)=>{
  try{
    const rows=await ChatMessage.find().populate('userId','name mobile village status').sort({createdAt:1}).limit(500).lean();
    res.json(rows);
  }catch(e){next(e)}
});

router.post('/admin/reply',requireAdmin,async(req,res,next)=>{
  try{
    const {userId,message,mediaUrl,mediaType='none'}=req.body||{};
    if(!userId)return res.status(400).json({message:'userId is required'});
    if(!message&&!mediaUrl)return res.status(400).json({message:'Message or media is required'});
    const msg=await ChatMessage.create({userId,sender:'admin',message,mediaUrl,mediaType});
    res.status(201).json(msg);
  }catch(e){next(e)}
});

export default router;
