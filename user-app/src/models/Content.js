import mongoose from 'mongoose';
import User from './User.js';
import { protectMobile } from '../services/privacyCrypto.js';

const commentSchema=new mongoose.Schema({
  userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  userName:{type:String,required:true,trim:true},
  text:{type:String,required:true,trim:true,maxlength:500},
  createdAt:{type:Date,default:Date.now}
},{_id:true});

const storyViewSchema=new mongoose.Schema({
  userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
  viewedAt:{type:Date,default:Date.now}
},{_id:false});

const schema=new mongoose.Schema({
  type:{type:String,enum:['status','banner','category','post','shop','service','event','incident','job','offer','vehicle','worker'],required:true,index:true},
  title:{type:String,trim:true},
  description:{type:String,trim:true},
  mediaUrl:String,
  mediaPublicId:String,
  mediaType:{type:String,enum:['image','video','none'],default:'none'},
  linkUrl:String,
  // Sensitive listing contacts are never stored inside public meta.
  contactEncrypted:{type:String,select:false,default:''},
  contactHash:{type:String,select:false,default:''},
  contactLast4:{type:String,select:false,default:''},
  whatsappEncrypted:{type:String,select:false,default:''},
  whatsappHash:{type:String,select:false,default:''},
  whatsappLast4:{type:String,select:false,default:''},
  area:String,
  price:Number,
  source:{type:String,enum:['admin','user'],default:'admin',index:true},
  ownerUserId:{type:mongoose.Schema.Types.ObjectId,ref:'User',index:true},
  status:{type:String,enum:['draft','payment-pending','pending','approved','changes-required','rejected','expired','applied'],default:'draft',index:true},
  planCode:String,planLabel:String,planAmount:Number,planDurationDays:Number,
  planSnapshot:{type:mongoose.Schema.Types.Mixed,default:{}},
  renewalAllowed:{type:Boolean,default:true},
  renewalGraceDays:{type:Number,default:10},
  renewalOf:{type:mongoose.Schema.Types.ObjectId,ref:'Content',default:null,index:true},
  editOf:{type:mongoose.Schema.Types.ObjectId,ref:'Content',default:null,index:true},
  publishingPassId:{type:mongoose.Schema.Types.ObjectId,ref:'PublishingPass',default:null,index:true},
  paymentStatus:{type:String,enum:['not-required','pending','paid','refund-pending','refunded','refund-failed'],default:'not-required',index:true},
  paymentOrderId:String,paymentId:String,paymentSignature:String,paidAt:Date,approvedAt:Date,refundId:String,reviewNote:String,
  startsAt:Date,endsAt:Date,publishedAt:Date,expiresAt:Date,renewalGraceUntil:Date,purgedAt:Date,
  userDeletedAt:{type:Date,default:null,index:true},
  sortOrder:{type:Number,default:0},
  likes:[{type:mongoose.Schema.Types.ObjectId,ref:'User'}],
  comments:{type:[commentSchema],default:[]},
  shareCount:{type:Number,default:0,min:0},
  storyViews:{type:[storyViewSchema],default:[]},
  meta:{type:mongoose.Schema.Types.Mixed,default:{}}
},{timestamps:true});

schema.pre('save',function(next){
  if(this.meta&&typeof this.meta==='object'){
    const meta={...this.meta};
    const contact=String(meta.contactMobile||'').replace(/\D/g,'').slice(-10);
    const whatsapp=String(meta.whatsapp||'').replace(/\D/g,'').slice(-10);
    if(contact.length===10){
      const secured=protectMobile(contact);
      this.contactEncrypted=secured.mobileEncrypted;
      this.contactHash=secured.mobileHash;
      this.contactLast4=secured.mobileLast4;
    }
    if(whatsapp.length===10){
      const secured=protectMobile(whatsapp);
      this.whatsappEncrypted=secured.mobileEncrypted;
      this.whatsappHash=secured.mobileHash;
      this.whatsappLast4=secured.mobileLast4;
    }
    if('contactMobile' in meta||'whatsapp' in meta){
      delete meta.contactMobile;
      delete meta.whatsapp;
      this.meta=meta;
      this.markModified('meta');
    }
  }

  // User submissions go live automatically once payment/free access is valid.
  // Manual pre-approval is intentionally removed. Report/takedown moderation remains.
  if(this.source==='user'&&this.paymentStatus==='paid'&&this.status==='pending'&&!this.editOf){
    const now=new Date();
    this.$locals.autoPublishedNow=true;
    this.status='approved';
    this.approvedAt=this.approvedAt||now;
    this.publishedAt=this.publishedAt||now;
    this.startsAt=this.startsAt||now;
    const days=Number(this.planDurationDays||0);
    if(this.type==='status'&&!this.expiresAt)this.expiresAt=new Date(now.getTime()+24*60*60*1000);
    else if(this.type==='event'&&this.endsAt)this.expiresAt=this.endsAt;
    else if(days>0&&!this.expiresAt)this.expiresAt=new Date(now.getTime()+days*24*60*60*1000);
    if(this.expiresAt&&this.renewalAllowed){
      const grace=Math.max(0,Number(this.renewalGraceDays||0));
      this.renewalGraceUntil=new Date(new Date(this.expiresAt).getTime()+grace*24*60*60*1000);
    }
  }
  next();
});


schema.post('save',async function(doc){
  if(doc.$locals?.autoPublishedNow&&doc.paymentId==='free_quota'&&['status','post'].includes(doc.type)){
    await User.updateOne({_id:doc.ownerUserId},{$inc:{[`freeApprovedCounts.${doc.type}`]:1}});
  }
});

schema.index({type:1,status:1,sortOrder:1});
schema.index({ownerUserId:1,createdAt:-1});
export default mongoose.model('Content',schema);
