import { Router } from 'express';
import User from '../models/User.js';
import Block from '../models/Block.js';
import { requireUser } from '../middleware/auth.js';

const router=Router();
router.use(requireUser);
const escapeRegex=value=>String(value||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

router.get('/',async(req,res,next)=>{try{
  const q=String(req.query.q||'').trim();
  if(q.length<2)return res.json([]);
  const me=req.user.userId;
  const blocks=await Block.find({$or:[{blockerId:me},{blockedId:me}]}).select('blockerId blockedId').lean();
  const hidden=blocks.map(r=>String(r.blockerId)===String(me)?r.blockedId:r.blockerId);
  const re=new RegExp(escapeRegex(q),'i');
  const rows=await User.find({_id:{$ne:me,$nin:hidden},status:'active',$or:[{name:re},{username:re},{village:re}]})
    .select('name username village gender profilePhotoUrl isPrivate')
    .limit(30).lean();
  res.json(rows.map(u=>({id:String(u._id),name:u.name,username:u.username||'',village:u.village||'',gender:u.gender||'other',profilePhotoUrl:u.profilePhotoUrl||'',isPrivate:Boolean(u.isPrivate)})));
}catch(e){next(e)}});

export default router;
