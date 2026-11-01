import Content from '../models/Content.js';
import Notification from '../models/Notification.js';
import { cloudinary } from '../config/cloudinary.js';

const DAY=24*60*60*1000;

function expiryKey(prefix,item){
  return `${prefix}:${item._id}:${new Date(item.expiresAt).toISOString()}`;
}

export async function createExpiryNotifications({days=3}={}){
  const now=new Date();
  const until=new Date(now.getTime()+days*DAY);
  const rows=await Content.find({
    source:'user',status:'approved',ownerUserId:{$ne:null},renewalAllowed:true,
    expiresAt:{$gt:now,$lte:until},purgedAt:null,userDeletedAt:null
  }).lean();

  for(const item of rows){
    const remaining=Math.max(1,Math.ceil((new Date(item.expiresAt)-now)/DAY));
    // Keep the original key format so users do not receive duplicate pre-expiry alerts after this upgrade.
    const uniqueKey=expiryKey('expiry',item);
    await Notification.updateOne(
      {uniqueKey},
      {$setOnInsert:{
        userId:item.ownerUserId,type:'expiry',contentId:item._id,uniqueKey,
        title:`${item.planLabel||item.type} expires soon`,
        message:`“${item.title||'Your listing'}” expires in ${remaining} day${remaining===1?'':'s'}. Renew to keep it live.`,
        actionUrl:'/my-submissions'
      }},
      {upsert:true}
    ).catch(()=>{});
  }
  return rows.length;
}

async function ensureExpiryDayNotification(item){
  if(!item?.ownerUserId||!item?.expiresAt||item.source!=='user')return;
  const graceDays=item.renewalAllowed?Math.max(0,Number(item.renewalGraceDays??10)):0;
  const uniqueKey=expiryKey('expiry-day',item);
  const graceText=graceDays>0
    ? ` You have ${graceDays} day${graceDays===1?'':'s'} to renew before it is removed.`
    : ' It is no longer live.';
  await Notification.updateOne(
    {uniqueKey},
    {$setOnInsert:{
      userId:item.ownerUserId,type:'expiry',contentId:item._id,uniqueKey,
      title:`${item.planLabel||item.type} expired today`,
      message:`“${item.title||'Your listing'}” has expired.${graceText}`,
      actionUrl:'/my-submissions'
    }},
    {upsert:true}
  ).catch(()=>{});
}

async function purgeExpiredItem(item,now){
  if(item.mediaPublicId){
    try{
      await cloudinary.uploader.destroy(item.mediaPublicId,{
        resource_type:item.mediaType==='video'?'video':'image',
        invalidate:true
      });
    }catch(error){
      // Do not mark as purged when Cloudinary deletion fails; the hourly lifecycle job will retry.
      console.error('Cloudinary lifecycle purge failed',item.id,error?.message||error);
      return false;
    }
  }

  item.purgedAt=now;
  item.mediaUrl='';
  item.mediaPublicId='';
  item.mediaType='none';
  item.linkUrl='';
  await item.save();
  return true;
}

export async function processExpiredContent(){
  const now=new Date();
  const result={warningNotifications:0,expired:0,expiryDayNotifications:0,purged:0};
  result.warningNotifications=await createExpiryNotifications({days:3}).catch(()=>0);

  const newlyExpired=await Content.find({
    status:'approved',userDeletedAt:null,purgedAt:null,expiresAt:{$lte:now}
  });
  for(const item of newlyExpired){
    item.status='expired';
    const graceDays=item.renewalAllowed?Math.max(0,Number(item.renewalGraceDays??10)):0;
    item.renewalGraceUntil=graceDays?new Date(item.expiresAt.getTime()+graceDays*DAY):null;
    await item.save();
    result.expired+=1;
    await ensureExpiryDayNotification(item);
    result.expiryDayNotifications+=1;
  }

  // Catch items that expired while the service was unavailable, but are still inside their grace period.
  const expiredInGrace=await Content.find({
    source:'user',status:'expired',ownerUserId:{$ne:null},purgedAt:null,userDeletedAt:null,
    renewalGraceUntil:{$gt:now},expiresAt:{$lte:now}
  });
  for(const item of expiredInGrace)await ensureExpiryDayNotification(item);

  const purgeCandidates=await Content.find({
    status:'expired',purgedAt:null,userDeletedAt:null,
    $or:[
      {renewalGraceUntil:{$ne:null,$lte:now}},
      {renewalAllowed:false,renewalGraceUntil:null,expiresAt:{$lte:now}}
    ]
  });
  for(const item of purgeCandidates){
    if(await purgeExpiredItem(item,now))result.purged+=1;
  }

  return result;
}
