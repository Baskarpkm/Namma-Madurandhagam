import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireUser } from '../middleware/auth.js';
import { cloudinary } from '../config/cloudinary.js';

const router=Router();
const devOtps=new Map();
const USERNAME_RE=/^[a-z0-9_]{3,30}$/;

const normalizeUsername=value=>String(value||'').trim().toLowerCase().replace(/^@/,'');
const testOtpEnabled=()=>process.env.ENABLE_TEST_OTP==='true'||process.env.NODE_ENV!=='production';
const testOtpCode=()=>String(process.env.TEST_OTP_CODE||'123456').replace(/\D/g,'').slice(0,6).padStart(6,'0');

const userShape=(user)=>({
  id:String(user._id||user.id),
  name:user.name,
  username:user.username||'',
  mobile:user.mobile,
  village:user.village||'',
  address:user.address||'',
  gender:user.gender||'other',
  profilePhotoUrl:user.profilePhotoUrl||'',
  isPrivate:Boolean(user.isPrivate),
  allowCalls:Boolean(user.allowCalls),
  allowMessages:Boolean(user.allowMessages),
  status:user.status||'active',
  statusReason:user.statusReason||'',
  suspendedUntil:user.suspendedUntil||null
});

function issueUserToken(user){
  return jwt.sign({role:'user',userId:user.id,mobile:user.mobile},process.env.JWT_SECRET,{expiresIn:'30d'});
}

async function reactivateIfExpired(user){
  if(user?.status==='suspended'&&user.suspendedUntil&&new Date(user.suspendedUntil)<=new Date()){
    user.status='active';
    user.statusReason='';
    user.suspendedUntil=null;
    user.statusUpdatedAt=new Date();
    await user.save();
  }
  return user;
}

router.post('/admin/login',(req,res)=>{
  const {username,password}=req.body||{};
  if(!process.env.ADMIN_PASSWORD)return res.status(503).json({message:'ADMIN_PASSWORD is not configured'});
  if(username!==process.env.ADMIN_USERNAME||password!==process.env.ADMIN_PASSWORD)return res.status(401).json({message:'Invalid username or password'});
  const token=jwt.sign({role:'admin',username},process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRES_IN||'7d'});
  res.json({token,admin:{username}});
});

router.post('/user/check-mobile',async(req,res,next)=>{try{
  const mobile=String(req.body?.mobile||'').replace(/\D/g,'');
  if(mobile.length!==10)return res.status(400).json({message:'Enter a valid 10 digit mobile number'});
  const user=await User.findOne({mobile}).select('_id status statusReason suspendedUntil').lean();
  res.json({registered:Boolean(user),status:user?.status||null});
}catch(e){next(e)}});

router.post('/user/check-username',async(req,res,next)=>{try{
  const username=normalizeUsername(req.body?.username);
  if(!USERNAME_RE.test(username))return res.status(400).json({available:false,message:'Username must be 3–30 characters using letters, numbers or underscore only.'});
  const exists=await User.exists({username});
  res.json({username,available:!exists,message:exists?'Username already exists.':'Username available.'});
}catch(e){next(e)}});

// TEMPORARY DEVELOPMENT OTP. Enable on Render with ENABLE_TEST_OTP=true.
// Remove/disable this flag when Firebase Phone Authentication is activated.
router.post('/user/request-otp',async(req,res)=>{
  const mobile=String(req.body?.mobile||'').replace(/\D/g,'');
  if(mobile.length!==10)return res.status(400).json({message:'Enter a valid 10 digit mobile number'});
  if(!testOtpEnabled())return res.status(503).json({message:'Test OTP is disabled. Set ENABLE_TEST_OTP=true for development.'});
  const otp=testOtpCode();
  devOtps.set(mobile,{otp,expiresAt:Date.now()+5*60*1000});
  res.json({ok:true,message:'Development OTP generated',devOtp:otp,expiresInSeconds:300});
});

router.post('/user/verify-otp',async(req,res,next)=>{try{
  const mobile=String(req.body?.mobile||'').replace(/\D/g,'');
  const otp=String(req.body?.otp||'').replace(/\D/g,'');
  const name=String(req.body?.name||'').trim();
  const username=normalizeUsername(req.body?.username);
  const village=String(req.body?.village||'').trim();
  const address=String(req.body?.address||'').trim();
  const gender=['male','female','other'].includes(req.body?.gender)?req.body.gender:'other';
  if(mobile.length!==10)return res.status(400).json({message:'Enter a valid mobile number'});
  if(!testOtpEnabled())return res.status(503).json({message:'Test OTP is disabled.'});
  const record=devOtps.get(mobile);
  if(!record||record.expiresAt<Date.now()||record.otp!==otp)return res.status(400).json({message:'Invalid or expired OTP'});

  let user=await User.findOne({mobile});
  if(!user){
    if(!name)return res.status(400).json({message:'Name is required for first registration'});
    if(!USERNAME_RE.test(username))return res.status(400).json({message:'Choose a valid username using 3–30 letters, numbers or underscore.'});
    if(!village)return res.status(400).json({message:'Area / Village is required for first registration'});
    if(await User.exists({username}))return res.status(409).json({message:'Username already exists. Please choose another username.'});
    user=await User.create({name,username,mobile,village,address,gender,isVerified:true,lastSeenAt:new Date()});
  }else{
    await reactivateIfExpired(user);
    user.isVerified=true;
    user.lastSeenAt=new Date();
    await user.save();
  }
  devOtps.delete(mobile);
  res.json({token:issueUserToken(user),user:userShape(user)});
}catch(e){
  if(e?.code===11000&&e?.keyPattern?.username)return res.status(409).json({message:'Username already exists. Please choose another username.'});
  next(e)
}});

router.get('/user/me',requireUser,async(req,res,next)=>{try{
  let user=await User.findById(req.user.userId);
  if(!user)return res.status(404).json({message:'User account not found'});
  user=await reactivateIfExpired(user);
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
