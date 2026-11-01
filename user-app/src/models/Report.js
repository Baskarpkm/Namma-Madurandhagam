import mongoose from 'mongoose';

const schema=new mongoose.Schema({
  reporterId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  targetType:{type:String,enum:['post'],default:'post',index:true},
  contentId:{type:mongoose.Schema.Types.ObjectId,ref:'Content',required:true,index:true},
  ownerUserId:{type:mongoose.Schema.Types.ObjectId,ref:'User',default:null,index:true},
  reason:{type:String,enum:['spam','false-information','harassment','inappropriate','scam','other'],required:true},
  details:{type:String,trim:true,maxlength:500,default:''},
  status:{type:String,enum:['open','reviewed','dismissed','removed'],default:'open',index:true},
  adminNote:{type:String,trim:true,maxlength:1000,default:''},
  reviewedAt:{type:Date,default:null}
},{timestamps:true});

schema.index({reporterId:1,contentId:1},{unique:true});
schema.index({status:1,createdAt:-1});

export default mongoose.model('Report',schema);
