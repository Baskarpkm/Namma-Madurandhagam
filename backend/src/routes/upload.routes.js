import { Router } from 'express';
import multer from 'multer';
import { requireAdmin, requireUser } from '../middleware/auth.js';
import { cloudinary } from '../config/cloudinary.js';

const router=Router();
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:100*1024*1024}});

function uploadBuffer(buffer,options){
  return new Promise((resolve,reject)=>{
    const stream=cloudinary.uploader.upload_stream(options,(error,result)=>error?reject(error):resolve(result));
    stream.end(buffer);
  });
}

async function uploadToCloudinary(req,res,next,{maxVideoSeconds=null,imageOnly=false,folder='namma-madurandhagam'}={}){
  try{
    if(!req.file)return res.status(400).json({message:'File is required'});
    if(!process.env.CLOUDINARY_CLOUD_NAME)return res.status(503).json({message:'Cloudinary is not configured'});

    const isImage=req.file.mimetype?.startsWith('image/');
    const isVideo=req.file.mimetype?.startsWith('video/');
    if(imageOnly&&!isImage)return res.status(400).json({message:'Profile photo must be an image'});
    if(!isImage&&!isVideo)return res.status(400).json({message:'Only image or video files are supported'});

    const options={
      resource_type:isVideo?'video':'image',
      folder
    };

    // Cloudinary incoming transformation: videos longer than the allowed duration
    // are stored as the first N seconds instead of being rejected.
    if(isVideo&&maxVideoSeconds){
      options.transformation=[{start_offset:0,duration:maxVideoSeconds}];
    }

    const result=await uploadBuffer(req.file.buffer,options);
    res.json({
      url:result.secure_url,
      publicId:result.public_id,
      resourceType:result.resource_type,
      duration:result.duration||null,
      maxVideoSeconds:maxVideoSeconds||null
    });
  }catch(e){next(e)}
}

router.post('/',requireAdmin,upload.single('file'),(req,res,next)=>uploadToCloudinary(req,res,next));
// User media defaults to a maximum stored video duration of 2 minutes.
router.post('/user',requireUser,upload.single('file'),(req,res,next)=>uploadToCloudinary(req,res,next,{maxVideoSeconds:120}));
// Story/status videos are automatically trimmed to the first 30 seconds.
router.post('/user/short',requireUser,upload.single('file'),(req,res,next)=>uploadToCloudinary(req,res,next,{maxVideoSeconds:30}));
router.post('/user/avatar',requireUser,upload.single('file'),(req,res,next)=>uploadToCloudinary(req,res,next,{imageOnly:true,folder:'namma-madurandhagam/avatars'}));
export default router;
