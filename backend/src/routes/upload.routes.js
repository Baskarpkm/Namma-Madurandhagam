import { Router } from 'express';
import multer from 'multer';
import { requireAdmin, requireUser } from '../middleware/auth.js';
import { cloudinary } from '../config/cloudinary.js';
const router=Router();
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:25*1024*1024}});

async function uploadToCloudinary(req,res,next,{maxVideoSeconds=null,imageOnly=false,folder='namma-madurandhagam'}={}){
  try{
    if(!req.file)return res.status(400).json({message:'File is required'});
    if(!process.env.CLOUDINARY_CLOUD_NAME)return res.status(503).json({message:'Cloudinary is not configured'});
    const isImage=req.file.mimetype?.startsWith('image/');
    const isVideo=req.file.mimetype?.startsWith('video/');
    if(imageOnly&&!isImage)return res.status(400).json({message:'Profile photo must be an image'});
    if(!isImage&&!isVideo)return res.status(400).json({message:'Only image or video files are supported'});
    const dataUrl=`data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const result=await cloudinary.uploader.upload(dataUrl,{resource_type:imageOnly?'image':'auto',folder});
    if(maxVideoSeconds&&result.resource_type==='video'&&Number(result.duration||0)>maxVideoSeconds){
      await cloudinary.uploader.destroy(result.public_id,{resource_type:'video'}).catch(()=>{});
      return res.status(400).json({message:`Video must be ${maxVideoSeconds} seconds or shorter`});
    }
    res.json({url:result.secure_url,publicId:result.public_id,resourceType:result.resource_type,duration:result.duration||null});
  }catch(e){next(e)}
}

router.post('/',requireAdmin,upload.single('file'),(req,res,next)=>uploadToCloudinary(req,res,next));
router.post('/user',requireUser,upload.single('file'),(req,res,next)=>uploadToCloudinary(req,res,next));
router.post('/user/short',requireUser,upload.single('file'),(req,res,next)=>uploadToCloudinary(req,res,next,{maxVideoSeconds:30}));
router.post('/user/avatar',requireUser,upload.single('file'),(req,res,next)=>uploadToCloudinary(req,res,next,{imageOnly:true,folder:'namma-madurandhagam/avatars'}));
export default router;
