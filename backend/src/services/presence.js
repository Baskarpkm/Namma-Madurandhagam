import User from '../models/User.js';
import PresenceDaily from '../models/PresenceDaily.js';

const ONLINE_WINDOW_MS=90*1000;
const ACTIVE_WINDOW_MS=5*60*1000;
const PEAK_THROTTLE_MS=5000;
let lastPeakCheckAt=0;
let peakPromise=null;

export function indiaDateKey(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-GB',{
    timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(date);
  const map=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

async function updatePeak(now=new Date(),force=false){
  const stamp=now.getTime();
  if(!force&&stamp-lastPeakCheckAt<PEAK_THROTTLE_MS)return peakPromise;
  lastPeakCheckAt=stamp;
  peakPromise=(async()=>{
    const onlineSince=new Date(stamp-ONLINE_WINDOW_MS);
    const onlineNow=await User.countDocuments({status:'active',lastSeenAt:{$gte:onlineSince}});
    const dateKey=indiaDateKey(now);
    await PresenceDaily.updateOne(
      {dateKey},
      {$setOnInsert:{dateKey},$max:{peakOnline:onlineNow}},
      {upsert:true}
    );
    return onlineNow;
  })().catch(()=>null).finally(()=>{peakPromise=null});
  return peakPromise;
}

export async function touchPresence(userId){
  const now=new Date();
  await User.updateOne({_id:userId,status:'active'},{$set:{lastSeenAt:now}});
  updatePeak(now).catch(()=>{});
  return now;
}

export async function getPresenceSummary(){
  const now=new Date();
  const [onlineNow,activeLast5Min]=await Promise.all([
    User.countDocuments({status:'active',lastSeenAt:{$gte:new Date(now.getTime()-ONLINE_WINDOW_MS)}}),
    User.countDocuments({status:'active',lastSeenAt:{$gte:new Date(now.getTime()-ACTIVE_WINDOW_MS)}})
  ]);
  const dateKey=indiaDateKey(now);
  await PresenceDaily.updateOne(
    {dateKey},
    {$setOnInsert:{dateKey},$max:{peakOnline:onlineNow}},
    {upsert:true}
  );
  const today=await PresenceDaily.findOne({dateKey}).select('peakOnline').lean();
  return {
    onlineNow,
    activeLast5Min,
    todayPeakOnline:Math.max(onlineNow,Number(today?.peakOnline||0)),
    onlineWindowSeconds:Math.round(ONLINE_WINDOW_MS/1000)
  };
}
