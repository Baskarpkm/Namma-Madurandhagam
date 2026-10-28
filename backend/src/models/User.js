import mongoose from 'mongoose';

const schema=new mongoose.Schema({
  name:{type:String,required:true,trim:true},
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
  status:{type:String,enum:['active','suspended','banned'],default:'active'},
  freeApprovedCounts:{
    status:{type:Number,default:0,min:0},
    post:{type:Number,default:0,min:0}
  }
},{timestamps:true});

export default mongoose.model('User',schema);
