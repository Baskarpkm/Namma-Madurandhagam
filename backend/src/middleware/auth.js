import jwt from 'jsonwebtoken';

function readToken(req){
  return req.headers.authorization?.replace(/^Bearer\s+/, '');
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

export function requireUser(req,res,next){
  const token=readToken(req);
  if(!token)return res.status(401).json({message:'User token required'});
  try{
    const payload=jwt.verify(token,process.env.JWT_SECRET);
    if(payload.role!=='user')throw new Error('Forbidden');
    req.user=payload;
    next();
  }catch{
    return res.status(401).json({message:'Invalid or expired user token'});
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
