import mongoose from 'mongoose';

const schema=new mongoose.Schema({
  dateKey:{type:String,required:true,unique:true,index:true},
  peakOnline:{type:Number,default:0,min:0}
},{timestamps:true});

export default mongoose.model('PresenceDaily',schema);
