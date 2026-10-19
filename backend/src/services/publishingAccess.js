import Content from '../models/Content.js';
import PublishingPass from '../models/PublishingPass.js';
import User from '../models/User.js';
import { getFreeQuotaPlan } from '../config/postPlans.js';

const DAY=24*60*60*1000;

export async function getActivePass(userId,type){
  const now=new Date();
  const rows=await PublishingPass.find({userId,type,active:true,expiresAt:{$gt:now}}).sort({expiresAt:1,createdAt:1});
  for(const pass of rows){
    if(pass.publishLimit==null||Number(pass.usedCount||0)<Number(pass.publishLimit))return pass;
    if(pass.active){pass.active=false;await pass.save().catch(()=>{});}
  }
  return null;
}

export async function getPublishingAccess(userId,type){
  if(!['status','post'].includes(type))return {type,free:null,activePass:null};
  const freePlan=await getFreeQuotaPlan(type);
  const user=await User.findById(userId).select('freeApprovedCounts').lean();
  const limit=Number(freePlan?.publishLimit||0);
  const approvedUsed=Number(user?.freeApprovedCounts?.[type]||0);
  const reserved=freePlan?await Content.countDocuments({
    ownerUserId:userId,source:'user',type,planCode:freePlan.code,status:{$in:['pending','changes-required']}
  }):0;
  const used=approvedUsed+reserved;
  const activePass=await getActivePass(userId,type);
  return {
    type,
    free:freePlan?{planCode:freePlan.code,label:freePlan.label,limit,approvedUsed,reserved,used,remaining:Math.max(0,limit-used)}:null,
    activePass:activePass?{
      id:String(activePass._id),planCode:activePass.planCode,planLabel:activePass.planLabel,startsAt:activePass.startsAt,expiresAt:activePass.expiresAt,
      publishLimit:activePass.publishLimit,usedCount:activePass.usedCount,remaining:activePass.publishLimit==null?null:Math.max(0,activePass.publishLimit-activePass.usedCount)
    }:null
  };
}

export async function consumeActivePass(userId,type){
  const pass=await getActivePass(userId,type);
  if(!pass)return null;
  pass.usedCount=Number(pass.usedCount||0)+1;
  if(pass.publishLimit!=null&&pass.usedCount>=pass.publishLimit)pass.active=false;
  await pass.save();
  return pass;
}

export async function activatePackForContent(item){
  const snapshot=item.planSnapshot||{};
  if(snapshot.billingMode!=='pack')return null;
  const validity=Number(snapshot.packValidityDays||0);
  if(!validity)return null;
  let pass=await PublishingPass.findOne({purchaseContentId:item._id});
  if(pass)return pass;
  const startsAt=new Date();
  const expiresAt=new Date(startsAt.getTime()+validity*DAY);
  pass=await PublishingPass.create({
    userId:item.ownerUserId,type:item.type,planCode:item.planCode,planLabel:item.planLabel,amount:Number(item.planAmount||0),
    startsAt,expiresAt,publishLimit:snapshot.publishLimit??null,usedCount:1,active:true,paymentId:item.paymentId,purchaseContentId:item._id
  });
  if(pass.publishLimit!=null&&pass.usedCount>=pass.publishLimit){pass.active=false;await pass.save();}
  item.publishingPassId=pass._id;
  await item.save();
  return pass;
}

export async function releasePassSlot(content){
  if(!content?.publishingPassId)return;
  const pass=await PublishingPass.findById(content.publishingPassId);
  if(!pass)return;
  pass.usedCount=Math.max(0,Number(pass.usedCount||0)-1);
  if(pass.expiresAt>new Date()&&(pass.publishLimit==null||pass.usedCount<pass.publishLimit))pass.active=true;
  await pass.save();
}
