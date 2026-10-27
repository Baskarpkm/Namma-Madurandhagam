import mongoose from 'mongoose';

const schema=new mongoose.Schema({
  userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  type:{type:String,enum:['expiry','approval','changes-required','rejected','payment','general','follow-request','follow','new-post'],default:'general',index:true},
  title:{type:String,required:true,trim:true},
  message:{type:String,required:true,trim:true},
  contentId:{type:mongoose.Schema.Types.ObjectId,ref:'Content',default:null,index:true},
  actionUrl:{type:String,default:''},
  uniqueKey:{type:String,unique:true,sparse:true},
  readAt:{type:Date,default:null,index:true}
},{timestamps:true});
schema.index({userId:1,createdAt:-1});
export default mongoose.model('Notification',schema);
