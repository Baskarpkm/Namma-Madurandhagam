import { Router } from 'express';
import Content from '../models/Content.js';
import AuditLog from '../models/AuditLog.js';
import { requireUser } from '../middleware/auth.js';

const router=Router();

router.post('/user/:id/edit-request',requireUser,async(req,res,next)=>{try{
  const item=await Content.findOne({_id:req.params.id,ownerUserId:req.user.userId,source:'user',userDeletedAt:null});
  if(!item)return res.status(404).json({message:'Listing not found'});
  const allowed=['title','description','area','price','mediaUrl','mediaPublicId','mediaType','linkUrl','endsAt','meta'];
  for(const key of allowed){
    if(req.body?.[key]!==undefined){
      if(key==='meta')item.meta={...(item.meta||{}),...(req.body.meta||{})};
      else item[key]=req.body[key];
    }
  }
  item.reviewNote='';
  if(item.status!=='expired')item.status='approved';
  item.publishedAt=item.publishedAt||new Date();
  item.approvedAt=item.approvedAt||new Date();
  await item.save();
  await AuditLog.create({actor:`user:${req.user.userId}`,action:'content.edit.direct',entityType:item.type,entityId:item.id,details:{manualApproval:false}});
  res.json(item);
}catch(e){next(e)}});

export default router;
