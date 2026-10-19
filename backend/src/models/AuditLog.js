import mongoose from 'mongoose';
const schema=new mongoose.Schema({actor:{type:String,required:true},action:{type:String,required:true},entityType:String,entityId:String,details:{type:mongoose.Schema.Types.Mixed,default:{}}},{timestamps:true});
export default mongoose.model('AuditLog',schema);
