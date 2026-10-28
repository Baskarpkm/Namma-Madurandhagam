import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireUser } from '../middleware/auth.js';
import { cloudinary } from '../config/cloudinary.js';

const router=Router();
const devOtps=new Map();

const userShape=(user)=>({
  id:String(user._id||user.id),
  name:user.name,
  mobile:user.mobile,
  village:user.village||'',
  address:user.address||'',
  gender:user.gender||'other',
  profilePhotoUrl:user.profilePhotoUrl||'',
  isPrivate:Boolean(user.isPrivate),
  allowCalls:Boolean(user.allowCalls),
  allowMessages:Boolean(user.allowMessages)
});

router.post('/admin/login',(req,res)=>{
  const {username,password}=req.body||{};
  if(!process.env.ADMIN_PASSWORD)return res.status(503).json({message:'ADMIN_PASSWORD is not configured'});
  if(username!==process.env.ADMIN_USERNAME||password!==process.env.ADMIN_PASSWORD)return res.status(401).json({message:'Invalid username or password'});
  const token=jwt.sign({role:'admin',username},process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRES_IN||'7d'});
  res.json({token,admin:{username}});
});

router.post('/user/check-mobile',async(req,res,next)=>{
  try{
    const mobile=String(req.body?.mobile||'').replace(/\D/g,'');
    if(mobile.length!==10)return res.status(400).json({message:'Enter a valid 10 digit mobile number'});
    const user=await User.findOne({mobile}).select('_id status').lean();
    res.json({registered:Boolean(user),status:user?.status||null});
  }catch(e){next(e)}
});

router.post('/user/request-otp',async(req,res)=>{
  const mobile=String(req.body?.mobile||'').replace(/\D/g,'');
  if(mobile.length!==10)return res.status(400).json({message:'Enter a valid 10 digit mobile number'});
  if(process.env.NODE_ENV==='production')return res.status(501).json({message:'Firebase Phone OTP is not configured yet.'});
  const otp='123456';
  devOtps.set(mobile,{otp,expiresAt:Date.now()+5*60*1000});
  res.json({ok:true,message:'Development OTP generated',devOtp:otp,expiresInSeconds:300});
});

router.post('/user/verify-otp',async(req,res,next)=>{
  try{
    const mobile=String(req.body?.mobile||'').replace(/\D/g,'');
    const otp=String(req.body?.otp||'');
    const name=String(req.body?.name||'').trim();
    const village=String(req.body?.village||'').trim();
    const address=String(req.body?.address||'').trim();
    const gender=['male','female','other'].includes(req.body?.gender)?req.body.gender:'other';
    if(mobile.length!==10)return res.status(400).json({message:'Enter a valid mobile number'});
    if(process.env.NODE_ENV==='production')return res.status(501).json({message:'Firebase Phone OTP verification is not configured yet.'});
    const record=devOtps.get(mobile);
    if(!record||record.expiresAt<Date.now()||record.otp!==otp)return res.status(400).json({message:'Invalid or expired OTP'});

    let user=await User.findOne({mobile});
    if(!user){
      if(!name)return res.status(400).json({message:'Name is required for first registration'});
      if(!village)return res.status(400).json({message:'Area / Village is required for first registration'});
      user=await User.create({name,mobile,village,address,gender,isVerified:true});
    }else{
      if(name)user.name=name;
      if(village)user.village=village;
      if(address)user.address=address;
      if(req.body?.gender)user.gender=gender;
      user.isVerified=true;
      await user.save();
    }
    devOtps.delete(mobile);
    const token=jwt.sign({role:'user',userId:user.id,mobile:user.mobile},process.env.JWT_SECRET,{expiresIn:'30d'});
    res.json({token,user:userShape(user)});
  }catch(e){next(e)}
});

router.get('/user/me',requireUser,async(req,res,next)=>{try{
  const user=await User.findById(req.user.userId);
  if(!user)return res.status(404).json({message:'User account not found'});
  res.json({user:userShape(user)});
}catch(e){next(e)}});

router.patch('/user/profile',requireUser,async(req,res,next)=>{try{
  const user=await User.findById(req.user.userId);
  if(!user)return res.status(404).json({message:'User account not found'});

  if(req.body?.name!==undefined){
    const name=String(req.body.name||'').trim();
    if(!name)return res.status(400).json({message:'Name cannot be empty'});
    user.name=name;
  }
  if(req.body?.village!==undefined)user.village=String(req.body.village||'').trim();
  if(req.body?.address!==undefined)user.address=String(req.body.address||'').trim();
  if(req.body?.gender!==undefined){
    if(!['male','female','other'].includes(req.body.gender))return res.status(400).json({message:'Choose a valid gender'});
    user.gender=req.body.gender;
  }
  if(req.body?.allowCalls!==undefined)user.allowCalls=Boolean(req.body.allowCalls);
  if(req.body?.allowMessages!==undefined)user.allowMessages=Boolean(req.body.allowMessages);

  if(req.body?.profilePhotoUrl!==undefined){
    const oldPublicId=user.profilePhotoPublicId;
    user.profilePhotoUrl=String(req.body.profilePhotoUrl||'');
    user.profilePhotoPublicId=String(req.body.profilePhotoPublicId||'');
    if(oldPublicId&&oldPublicId!==user.profilePhotoPublicId){
      cloudinary.uploader.destroy(oldPublicId,{resource_type:'image'}).catch(()=>{});
    }
  }

  await user.save();
  res.json({user:userShape(user)});
}catch(e){next(e)}});

export default router;
