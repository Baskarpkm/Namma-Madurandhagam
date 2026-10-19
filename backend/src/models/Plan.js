import mongoose from 'mongoose';

const schema=new mongoose.Schema({
  type:{type:String,enum:['status','post','banner','job','event','offer','shop','vehicle','worker'],required:true,index:true},
  code:{type:String,required:true,unique:true,trim:true,index:true},
  label:{type:String,required:true,trim:true},
  amount:{type:Number,required:true,min:0,default:0},
  // Public content lifetime. null = stays live until user deletes it (except event end-date logic).
  durationDays:{type:Number,default:null,min:1},
  // How the user pays/uses this plan.
  billingMode:{type:String,enum:['free_quota','per_submission','pack','listing','event'],default:'per_submission',index:true},
  // Publishing-pack validity and quota. null publishLimit = unlimited during the validity window.
  packValidityDays:{type:Number,default:null,min:1},
  publishLimit:{type:Number,default:null,min:1},
  active:{type:Boolean,default:true,index:true},
  sortOrder:{type:Number,default:0},
  renewalAllowed:{type:Boolean,default:true},
  renewalGraceDays:{type:Number,default:10,min:0},
  mediaMode:{type:String,enum:['none','image','video','image-or-video'],default:'image-or-video'},
  maxMediaItems:{type:Number,default:1,min:0,max:20},
  featured:{type:Boolean,default:false},
  notes:{type:String,default:''}
},{timestamps:true});
schema.index({type:1,active:1,sortOrder:1});
export default mongoose.model('Plan',schema);
