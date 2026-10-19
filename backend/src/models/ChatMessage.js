import mongoose from 'mongoose';
const schema=new mongoose.Schema({userId:{type:mongoose.Schema.Types.ObjectId,ref:'User'},sender:{type:String,enum:['user','admin'],required:true},message:String,mediaUrl:String,mediaType:{type:String,enum:['image','video','none'],default:'none'},readAt:Date},{timestamps:true});
export default mongoose.model('ChatMessage',schema);
