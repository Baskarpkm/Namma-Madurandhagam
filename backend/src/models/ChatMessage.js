import mongoose from 'mongoose';

const schema=new mongoose.Schema({
  // Legacy/admin-support conversation owner. Existing messages keep working.
  userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',default:null,index:true},

  // New shared chat metadata.
  kind:{type:String,enum:['admin-user','user-user'],default:null,index:true},
  conversationKey:{type:String,default:'',index:true},
  sender:{type:String,enum:['user','admin'],required:true},
  senderUserId:{type:mongoose.Schema.Types.ObjectId,ref:'User',default:null,index:true},
  receiverUserId:{type:mongoose.Schema.Types.ObjectId,ref:'User',default:null,index:true},

  message:{type:String,default:''},
  mediaUrl:{type:String,default:''},
  mediaType:{type:String,enum:['image','video','none'],default:'none'},
  readAt:{type:Date,default:null,index:true}
},{timestamps:true});

schema.index({conversationKey:1,createdAt:1});
schema.index({receiverUserId:1,readAt:1,createdAt:-1});

export default mongoose.model('ChatMessage',schema);
