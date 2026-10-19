import mongoose from 'mongoose';

const schema=new mongoose.Schema({
  userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  type:{type:String,enum:['status','post'],required:true,index:true},
  planCode:{type:String,required:true,index:true},
  planLabel:{type:String,required:true},
  amount:{type:Number,required:true,min:0},
  startsAt:{type:Date,required:true,default:Date.now},
  expiresAt:{type:Date,required:true,index:true},
  publishLimit:{type:Number,default:null,min:1},
  usedCount:{type:Number,default:0,min:0},
  active:{type:Boolean,default:true,index:true},
  paymentId:String,
  purchaseContentId:{type:mongoose.Schema.Types.ObjectId,ref:'Content',default:null,index:true}
},{timestamps:true});

schema.index({userId:1,type:1,active:1,expiresAt:1});
export default mongoose.model('PublishingPass',schema);
