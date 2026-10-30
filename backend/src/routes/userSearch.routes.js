import { Router } from 'express';
import User from '../models/User.js';
import { requireUser } from '../middleware/auth.js';

const router=Router();
router.use(requireUser);

const esc=value=>String(value||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

router.get('/',async(req,res,next)=>{try{
  const q=String(req.query.q||'').trim().replace(/^@/,'');
  if(q.length<2)return res.json({items:[]});
  const rx=new RegExp(esc(q),'i');
  const rows=await User.find({
    _id:{$ne:req.user.userId},
    status:'active',
    $or:[{username:rx},{name:rx},{village:rx}]
  })
    .select('name username village gender profilePhotoUrl isPrivate')
    .sort({username:1,name:1})
    .limit(30)
    .lean();

  res.json({items:rows.map(user=>({
    id:String(user._id),
    name:user.name,
    username:user.username||'',
    village:user.village||'',
    gender:user.gender||'other',
    profilePhotoUrl:user.profilePhotoUrl||'',
    isPrivate:Boolean(user.isPrivate)
  }))});
}catch(e){next(e)}});

export default router;
