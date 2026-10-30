import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { touchPresence } from '../services/presence.js';

const router=Router();

router.post('/heartbeat',requireUser,async(req,res,next)=>{try{
  const lastSeenAt=await touchPresence(req.user.userId);
  res.json({ok:true,lastSeenAt});
}catch(e){next(e)}});

export default router;
