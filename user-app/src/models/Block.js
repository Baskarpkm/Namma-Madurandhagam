import mongoose from 'mongoose';

const schema=new mongoose.Schema({
  blockerId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  blockedId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true}
},{timestamps:true});

schema.index({blockerId:1,blockedId:1},{unique:true});
schema.index({blockedId:1,blockerId:1});

export default mongoose.model('Block',schema);
