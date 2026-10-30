import jwt from 'jsonwebtoken';
import User from '../models/User.js';

function readToken(req){
  return req.headers.authorization?.replace(/^Bearer\s+/, '');
}

function blockedPayload(user){
  const suspendedUntil=user.suspendedUntil?new Date(user.suspendedUntil):null;
  const remainingDays=suspendedUntil?Math.max(0,Math.ceil((suspendedUntil-Date.now())/(24*60*60*1000))):null;
  return {
    message:user.status==='banned'?'Your account is banned.':'Your account is suspended.',
    code:user.status==='banned'?'ACCOUNT_BANNED':'ACCOUNT_SUSPENDED',
    accountStatus:{
      status:user.status,
      reason:user.statusReason||'',
      suspendedUntil,
      remainingDays
    }
  };
}

export function requireAdmin(req,res,next){
  const token=readToken(req);
  if(!token)return res.status(401).json({message:'Admin token required'});
  try{
    const payload=jwt.verify(token,process.env.JWT_SECRET);
    if(payload.role!=='admin')throw new Error('Forbidden');
    req.admin=payload;
    next();
  }catch{
    return res.status(401).json({message:'Invalid or expired admin token'});
  }
}

export async function requireUser(req,res,next){
  const token=readToken(req);
  if(!token)return res.status(401).json({message:'User token required'});
  try{
    const payload=jwt.verify(token,process.env.JWT_SECRET);
    if(payload.role!=='user')throw new Error('Forbidden');
    req.user=payload;

    // /auth/user/me must remain readable so the app can show the blocked-account screen.
    if(String(req.originalUrl||'').includes('/auth/user/me'))return next();

    const user=await User.findById(payload.userId).select('status statusReason suspendedUntil').lean();
    if(!user)return res.status(401).json({message:'User account not found'});

    if(user.status==='suspended'&&user.suspendedUntil&&new Date(user.suspendedUntil)<=new Date()){
      await User.updateOne({_id:payload.userId,status:'suspended'},{$set:{status:'active',statusReason:'',suspendedUntil:null,statusUpdatedAt:new Date()}});
      return next();
    }
    if(user.status!=='active')return res.status(403).json(blockedPayload(user));
    next();
  }catch(e){
    if(e?.name==='JsonWebTokenError'||e?.name==='TokenExpiredError')return res.status(401).json({message:'Invalid or expired user token'});
    next(e);
  }
}

export function optionalUser(req,res,next){
  const token=readToken(req);
  if(!token)return next();
  try{
    const payload=jwt.verify(token,process.env.JWT_SECRET);
    if(payload.role==='user')req.user=payload;
  }catch{}
  next();
}
