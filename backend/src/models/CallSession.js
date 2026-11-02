import mongoose from 'mongoose';

const schema=new mongoose.Schema({
  callerId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  receiverId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  status:{type:String,enum:['ringing','accepted','connected','declined','cancelled','missed','ended'],default:'ringing',index:true},
  offer:{type:mongoose.Schema.Types.Mixed,default:null},
  answer:{type:mongoose.Schema.Types.Mixed,default:null},
  callerCandidates:{type:[mongoose.Schema.Types.Mixed],default:[]},
  receiverCandidates:{type:[mongoose.Schema.Types.Mixed],default:[]},
  answeredAt:{type:Date,default:null},
  connectedAt:{type:Date,default:null},
  endedAt:{type:Date,default:null},
  durationSeconds:{type:Number,default:0,min:0}
},{timestamps:true});

schema.index({receiverId:1,status:1,createdAt:-1});
schema.index({callerId:1,status:1,createdAt:-1});
schema.index({callerId:1,receiverId:1,createdAt:-1});

export default mongoose.model('CallSession',schema);
