import { Router } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Content from '../models/Content.js';
import AuditLog from '../models/AuditLog.js';
import { requireUser } from '../middleware/auth.js';
import { activatePackForContent } from '../services/publishingAccess.js';
const router=Router();
function razorpay(){if(!process.env.RAZORPAY_KEY_ID||!process.env.RAZORPAY_KEY_SECRET)return null;return new Razorpay({key_id:process.env.RAZORPAY_KEY_ID,key_secret:process.env.RAZORPAY_KEY_SECRET});}

// Development-only mock payment. No real money is charged.
router.post('/mock-pay',requireUser,async(req,res,next)=>{try{
  const contentId=req.body?.contentId;
  const item=await Content.findOne({_id:contentId,ownerUserId:req.user.userId,source:'user'});
  if(!item)return res.status(404).json({message:'Submission not found'});
  if(item.paymentStatus==='paid')return res.json({mockPaid:true,alreadyPaid:true,content:item});
  if(item.status!=='payment-pending')return res.status(400).json({message:'This submission is not waiting for payment'});
  const amount=Number(item.planAmount);
  if(!Number.isFinite(amount)||amount<=0)return res.status(400).json({message:'Submission plan amount is invalid'});
  const ref=`mock_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  item.paymentOrderId=`mock_order_${Date.now()}`;
  item.paymentId=ref;
  item.paymentSignature='mock';
  item.paymentStatus='paid';
  item.paidAt=new Date();
  item.status='pending';
  await item.save();
  await activatePackForContent(item);
  await AuditLog.create({actor:`user:${req.user.userId}`,action:'payment.mock_verified',entityType:item.type,entityId:item.id,details:{amount:item.planAmount,paymentId:ref}});
  res.json({mockPaid:true,paymentId:ref,content:item});
}catch(e){next(e)}});

// Real Razorpay routes are retained for later production use.
router.post('/order',requireUser,async(req,res,next)=>{try{
  const contentId=req.body?.contentId;
  const item=await Content.findOne({_id:contentId,ownerUserId:req.user.userId,source:'user'});
  if(!item)return res.status(404).json({message:'Submission not found'});
  if(item.paymentStatus==='paid')return res.json({alreadyPaid:true,content:item});
  const amount=Number(item.planAmount);
  if(!Number.isFinite(amount)||amount<=0)return res.status(400).json({message:'Submission plan amount is invalid'});
  const client=razorpay();if(!client)return res.status(503).json({message:'Razorpay keys are not configured'});
  const order=await client.orders.create({amount:Math.round(amount*100),currency:'INR',receipt:`nm_${item.id}`.slice(0,40),notes:{submissionId:item.id,type:item.type,plan:item.planCode}});
  item.paymentOrderId=order.id;item.paymentStatus='pending';item.status='payment-pending';await item.save();
  res.json({order,keyId:process.env.RAZORPAY_KEY_ID,submission:{id:item.id,title:item.title,planLabel:item.planLabel,amount}});
}catch(e){next(e)}});

router.post('/verify',requireUser,async(req,res,next)=>{try{
  const {contentId,razorpay_order_id,razorpay_payment_id,razorpay_signature}=req.body||{};
  const item=await Content.findOne({_id:contentId,ownerUserId:req.user.userId,source:'user'});
  if(!item)return res.status(404).json({message:'Submission not found'});
  if(!razorpay_order_id||razorpay_order_id!==item.paymentOrderId)return res.status(400).json({message:'Payment order mismatch'});
  const body=`${razorpay_order_id}|${razorpay_payment_id}`;
  const expected=crypto.createHmac('sha256',process.env.RAZORPAY_KEY_SECRET||'').update(body).digest('hex');
  if(expected!==razorpay_signature)return res.status(400).json({message:'Payment verification failed'});
  item.paymentId=razorpay_payment_id;item.paymentSignature=razorpay_signature;item.paymentStatus='paid';item.paidAt=new Date();item.status='pending';await item.save();
  await activatePackForContent(item);
  await AuditLog.create({actor:`user:${req.user.userId}`,action:'payment.verified',entityType:item.type,entityId:item.id,details:{amount:item.planAmount,paymentId:razorpay_payment_id}});
  res.json({verified:true,content:item});
}catch(e){next(e)}});
export default router;
