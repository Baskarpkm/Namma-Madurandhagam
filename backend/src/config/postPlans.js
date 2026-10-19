import Plan from '../models/Plan.js';

export const DEFAULT_POST_PLANS = {
  status: [
    { code:'story_free_10',label:'First 10 Approved Stories - Free',amount:0,durationDays:1,billingMode:'free_quota',publishLimit:10,packValidityDays:null,renewalAllowed:false,renewalGraceDays:0,mediaMode:'image-or-video',maxMediaItems:1 },
    { code:'story_single_29',label:'1 Story',amount:29,durationDays:1,billingMode:'per_submission',publishLimit:1,packValidityDays:null,renewalAllowed:false,renewalGraceDays:0,mediaMode:'image-or-video',maxMediaItems:1 },
    { code:'story_day_99',label:'1 Day Pack - 10 Stories',amount:99,durationDays:1,billingMode:'pack',publishLimit:10,packValidityDays:1,renewalAllowed:false,renewalGraceDays:0,mediaMode:'image-or-video',maxMediaItems:1 },
    { code:'story_week_299',label:'1 Week Pack - 20 Stories',amount:299,durationDays:1,billingMode:'pack',publishLimit:20,packValidityDays:7,renewalAllowed:false,renewalGraceDays:0,mediaMode:'image-or-video',maxMediaItems:1 },
    { code:'story_month_699',label:'1 Month Pack - Unlimited Stories',amount:699,durationDays:1,billingMode:'pack',publishLimit:null,packValidityDays:30,renewalAllowed:false,renewalGraceDays:0,mediaMode:'image-or-video',maxMediaItems:1 }
  ],
  post: [
    { code:'post_free_10',label:'First 10 Approved Posts - Free',amount:0,durationDays:null,billingMode:'free_quota',publishLimit:10,packValidityDays:null,renewalAllowed:false,renewalGraceDays:0,mediaMode:'image-or-video',maxMediaItems:1 },
    { code:'post_single_29',label:'1 Post',amount:29,durationDays:null,billingMode:'per_submission',publishLimit:1,packValidityDays:null,renewalAllowed:false,renewalGraceDays:0,mediaMode:'image-or-video',maxMediaItems:1 },
    { code:'post_day_99',label:'1 Day Pack - 10 Posts',amount:99,durationDays:null,billingMode:'pack',publishLimit:10,packValidityDays:1,renewalAllowed:false,renewalGraceDays:0,mediaMode:'image-or-video',maxMediaItems:1 },
    { code:'post_week_299',label:'1 Week Pack - 20 Posts',amount:299,durationDays:null,billingMode:'pack',publishLimit:20,packValidityDays:7,renewalAllowed:false,renewalGraceDays:0,mediaMode:'image-or-video',maxMediaItems:1 },
    { code:'post_month_699',label:'1 Month Pack - Unlimited Posts',amount:699,durationDays:null,billingMode:'pack',publishLimit:null,packValidityDays:30,renewalAllowed:false,renewalGraceDays:0,mediaMode:'image-or-video',maxMediaItems:1 }
  ],
  banner: [
    { code:'banner_week',label:'Banner - 1 Week',amount:1000,durationDays:7,billingMode:'listing',renewalAllowed:true,renewalGraceDays:10,mediaMode:'image',maxMediaItems:1 },
    { code:'banner_month',label:'Banner - 1 Month',amount:3000,durationDays:30,billingMode:'listing',renewalAllowed:true,renewalGraceDays:10,mediaMode:'image',maxMediaItems:1 },
    { code:'banner_year',label:'Banner - 1 Year',amount:10000,durationDays:365,billingMode:'listing',renewalAllowed:true,renewalGraceDays:10,mediaMode:'image',maxMediaItems:1 }
  ],
  job: [
    { code:'job_week_199',label:'Job - 1 Week',amount:199,durationDays:7,billingMode:'listing',renewalAllowed:true,renewalGraceDays:10,mediaMode:'image-or-video',maxMediaItems:1 },
    { code:'job_month_399',label:'Job - 1 Month',amount:399,durationDays:30,billingMode:'listing',renewalAllowed:true,renewalGraceDays:10,mediaMode:'image-or-video',maxMediaItems:1 }
  ],
  event: [{ code:'event_fixed',label:'Event - Until Event End Date',amount:499,durationDays:null,billingMode:'event',renewalAllowed:false,renewalGraceDays:3,mediaMode:'image-or-video',maxMediaItems:1 }],
  offer: [
    { code:'offer_week_199',label:'Offer - 1 Week',amount:199,durationDays:7,billingMode:'listing',renewalAllowed:true,renewalGraceDays:10,mediaMode:'image-or-video',maxMediaItems:1 },
    { code:'offer_month_399',label:'Offer - 1 Month',amount:399,durationDays:30,billingMode:'listing',renewalAllowed:true,renewalGraceDays:10,mediaMode:'image-or-video',maxMediaItems:1 }
  ],
  shop: [{ code:'business_once_999',label:'Shop / Business - One Time',amount:999,durationDays:null,billingMode:'listing',renewalAllowed:false,renewalGraceDays:0,mediaMode:'image-or-video',maxMediaItems:1,notes:'No expiry. User can submit edits for Admin approval.' }],
  vehicle: [
    { code:'vehicle_week_199',label:'Vehicle - 1 Week',amount:199,durationDays:7,billingMode:'listing',renewalAllowed:true,renewalGraceDays:10,mediaMode:'image-or-video',maxMediaItems:1 },
    { code:'vehicle_month_399',label:'Vehicle - 1 Month',amount:399,durationDays:30,billingMode:'listing',renewalAllowed:true,renewalGraceDays:10,mediaMode:'image-or-video',maxMediaItems:1 }
  ],
  worker: [{ code:'worker_once_399',label:'Worker Listing - One Time',amount:399,durationDays:null,billingMode:'listing',renewalAllowed:false,renewalGraceDays:0,mediaMode:'image-or-video',maxMediaItems:1,notes:'No expiry. User can submit edits for Admin approval.' }]
};

export const USER_POST_TYPES = Object.keys(DEFAULT_POST_PLANS);
const LEGACY_PLAN_CODES=['story_24h','post_week','post_month','post_year','job_week','job_month','offer_30d','business_month','business_year','vehicle_week','vehicle_month','worker_week','worker_month','worker_year'];

export async function ensureDefaultPlans(){
  if(LEGACY_PLAN_CODES.length)await Plan.updateMany({code:{$in:LEGACY_PLAN_CODES}},{$set:{active:false}}).catch(()=>{});
  for(const [type,plans] of Object.entries(DEFAULT_POST_PLANS)){
    for(let index=0;index<plans.length;index++){
      const plan=plans[index];
      await Plan.updateOne({code:plan.code},{$setOnInsert:{type,...plan,active:true,sortOrder:index}},{upsert:true}).catch(()=>{});
      // Backfill new pricing semantics on older records without overwriting Admin-edited price/name/duration.
      const semantic={billingMode:plan.billingMode};
      if(plan.packValidityDays!=null)semantic.packValidityDays=plan.packValidityDays;
      if(plan.publishLimit!=null)semantic.publishLimit=plan.publishLimit;
      await Plan.updateOne({code:plan.code,billingMode:{$exists:false}},{$set:semantic}).catch(()=>{});
    }
  }
}

export async function getPublicPlans(){
  await ensureDefaultPlans();
  const rows=await Plan.find({active:true}).sort({type:1,sortOrder:1,amount:1}).lean();
  return rows.reduce((out,row)=>{(out[row.type] ||= []).push(row);return out;},{});
}

export async function getPostPlan(type,code,{allowInactive=false}={}){
  await ensureDefaultPlans();
  return Plan.findOne({type,code,...(allowInactive?{}:{active:true})}).lean();
}

export async function getFreeQuotaPlan(type){
  await ensureDefaultPlans();
  return Plan.findOne({type,billingMode:'free_quota',active:true}).sort({sortOrder:1}).lean();
}

export function planSnapshot(plan){
  return {
    code:plan.code,label:plan.label,amount:Number(plan.amount||0),durationDays:plan.durationDays??null,
    billingMode:plan.billingMode||'per_submission',packValidityDays:plan.packValidityDays??null,
    publishLimit:plan.publishLimit??null,renewalAllowed:Boolean(plan.renewalAllowed),renewalGraceDays:Number(plan.renewalGraceDays||0),
    mediaMode:plan.mediaMode||'image-or-video',maxMediaItems:Number(plan.maxMediaItems||1),featured:Boolean(plan.featured)
  };
}

export function computePublishedExpiry(item,startAt=new Date()){
  if(item.type==='event'){
    if(!item.endsAt)return null;
    return new Date(item.endsAt);
  }
  // Story is always a 24-hour public status regardless of which publishing pack paid for it.
  if(item.type==='status')return new Date(startAt.getTime()+24*60*60*1000);
  const days=Number(item.planDurationDays||item.planSnapshot?.durationDays||0);
  if(!days)return null;
  return new Date(startAt.getTime()+days*24*60*60*1000);
}
