import mongoose from 'mongoose';

const schema=new mongoose.Schema({
  name:{type:String,required:true,trim:true},
  username:{type:String,trim:true,lowercase:true,unique:true,sparse:true,index:true,minlength:3,maxlength:30},
  mobile:{type:String,required:true,unique:true,index:true},
  village:{type:String,trim:true},
  address:{type:String,trim:true,default:''},
  gender:{type:String,enum:['male','female','other'],default:'other'},
  profilePhotoUrl:{type:String,default:''},
  profilePhotoPublicId:{type:String,default:''},
  isPrivate:{type:Boolean,default:false,index:true},
  allowCalls:{type:Boolean,default:false,index:true},
  allowMessages:{type:Boolean,default:false,index:true},
  isVerified:{type:Boolean,default:false},
  status:{type:String,enum:['active','suspended','banned'],default:'active',index:true},
  statusReason:{type:String,trim:true,default:''},
  suspendedUntil:{type:Date,default:null,index:true},
  statusUpdatedAt:{type:Date,default:null},
  lastSeenAt:{type:Date,default:null,index:true},
  freeApprovedCounts:{
    status:{type:Number,default:0,min:0},
    post:{type:Number,default:0,min:0}
  }
},{timestamps:true});

schema.index({status:1,lastSeenAt:-1});
schema.index({username:1,status:1});

export default mongoose.model('User',schema);
