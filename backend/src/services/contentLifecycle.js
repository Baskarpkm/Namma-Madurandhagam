import Content from '../models/Content.js';
import Notification from '../models/Notification.js';

const DAY=24*60*60*1000;

export async function createExpiryNotifications({days=3}={}){
  const now=new Date();
  const until=new Date(now.getTime()+days*DAY);
  const rows=await Content.find({
    source:'user',status:'approved',ownerUserId:{$ne:null},renewalAllowed:true,
    expiresAt:{$gt:now,$lte:until},purgedAt:null,userDeletedAt:null
  }).lean();
  for(const item of rows){
    const remaining=Math.max(1,Math.ceil((new Date(item.expiresAt)-now)/DAY));
    const uniqueKey=`expiry:${item._id}:${new Date(item.expiresAt).toISOString()}`;
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

export async function processExpiredContent(){
  const now=new Date();
  await createExpiryNotifications({days:3}).catch(()=>{});

  const expired=await Content.find({status:'approved',userDeletedAt:null,expiresAt:{$lte:now}});
  for(const item of expired){
    item.status='expired';
    const graceDays=item.renewalAllowed?Number(item.renewalGraceDays ?? 10):0;
    item.renewalGraceUntil=graceDays?new Date(item.expiresAt.getTime()+graceDays*DAY):null;
    await item.save();
  }

  // User content/history is intentionally retained until the user deletes it.
  // Expired records are hidden from public feeds by status/expiry filters but remain in My Submissions.
}
