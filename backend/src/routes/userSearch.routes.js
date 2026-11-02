import { Router } from 'express';
import User from '../models/User.js';
import Block from '../models/Block.js';
import { requireUser } from '../middleware/auth.js';

const router=Router();
router.use(requireUser);
const escapeRegex=value=>String(value||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

router.get('/',async(req,res,next)=>{try{
  const raw=String(req.query.q||'').trim();
  const usernameQuery=raw.replace(/^@/,'').trim().toLowerCase();
  const textQuery=raw.startsWith('@')?usernameQuery:raw;
  if(usernameQuery.length<2&&textQuery.length<2)return res.json({items:[]});

  const me=req.user.userId;
  const blocks=await Block.find({$or:[{blockerId:me},{blockedId:me}]}).select('blockerId blockedId').lean();
  const hidden=blocks.map(r=>String(r.blockerId)===String(me)?r.blockedId:r.blockerId);
  const base={_id:{$ne:me,$nin:hidden},status:'active'};

  const exact=usernameQuery.length>=2
    ?await User.findOne({...base,username:usernameQuery}).select('name username village gender profilePhotoUrl isPrivate').lean()
    :null;

  const re=new RegExp(escapeRegex(textQuery),'i');
  const broad=await User.find({
    ...base,
    ...(exact?{_id:{$ne:me,$nin:[...hidden,exact._id]}}:{}),
    $or:[{name:re},{username:re},{village:re}]
  }).select('name username village gender profilePhotoUrl isPrivate').limit(exact?29:30).lean();

  const rows=exact?[exact,...broad]:broad;
  res.json({items:rows.map(u=>({
    id:String(u._id),name:u.name,username:u.username||'',village:u.village||'',gender:u.gender||'other',
    profilePhotoUrl:u.profilePhotoUrl||'',isPrivate:Boolean(u.isPrivate)
  }))});
}catch(e){next(e)}});

export default router;
