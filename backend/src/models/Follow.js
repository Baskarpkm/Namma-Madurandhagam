import mongoose from 'mongoose';

const schema=new mongoose.Schema({
  followerId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  followingId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  status:{type:String,enum:['pending','accepted'],default:'pending',index:true}
},{timestamps:true});

schema.index({followerId:1,followingId:1},{unique:true});
schema.index({followingId:1,status:1,createdAt:-1});
schema.index({followerId:1,status:1,createdAt:-1});

export default mongoose.model('Follow',schema);
