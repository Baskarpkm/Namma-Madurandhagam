import mongoose from 'mongoose';

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
  area:String,
  price:Number,
  source:{type:String,enum:['admin','user'],default:'admin',index:true},
  ownerUserId:{type:mongoose.Schema.Types.ObjectId,ref:'User',index:true},
  status:{type:String,enum:['draft','payment-pending','pending','approved','changes-required','rejected','expired','applied'],default:'draft',index:true},
  planCode:String,
  planLabel:String,
  planAmount:Number,
  planDurationDays:Number,
  planSnapshot:{type:mongoose.Schema.Types.Mixed,default:{}},
  renewalAllowed:{type:Boolean,default:true},
  renewalGraceDays:{type:Number,default:10},
  renewalOf:{type:mongoose.Schema.Types.ObjectId,ref:'Content',default:null,index:true},
  editOf:{type:mongoose.Schema.Types.ObjectId,ref:'Content',default:null,index:true},
  publishingPassId:{type:mongoose.Schema.Types.ObjectId,ref:'PublishingPass',default:null,index:true},
  paymentStatus:{type:String,enum:['not-required','pending','paid','refund-pending','refunded','refund-failed'],default:'not-required',index:true},
  paymentOrderId:String,
  paymentId:String,
  paymentSignature:String,
  paidAt:Date,
  approvedAt:Date,
  refundId:String,
  reviewNote:String,
  startsAt:Date,
  endsAt:Date,
  publishedAt:Date,
  expiresAt:Date,
  renewalGraceUntil:Date,
  purgedAt:Date,
  userDeletedAt:{type:Date,default:null,index:true},
  sortOrder:{type:Number,default:0},
  likes:[{type:mongoose.Schema.Types.ObjectId,ref:'User'}],
  comments:{type:[commentSchema],default:[]},
  shareCount:{type:Number,default:0,min:0},
  storyViews:{type:[storyViewSchema],default:[]},
  meta:{type:mongoose.Schema.Types.Mixed,default:{}}
},{timestamps:true});
schema.index({type:1,status:1,sortOrder:1});
schema.index({ownerUserId:1,createdAt:-1});
export default mongoose.model('Content',schema);
