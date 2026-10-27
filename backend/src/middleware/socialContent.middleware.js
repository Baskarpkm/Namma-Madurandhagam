import { Router } from 'express';
import mongoose from 'mongoose';
import { optionalUser } from './auth.js';
import Content from '../models/Content.js';
import User from '../models/User.js';
import Follow from '../models/Follow.js';
import Notification from '../models/Notification.js';

const router=Router();
router.use(optionalUser);

async function ownerAccess(contentId,userId){
  if(!mongoose.isValidObjectId(contentId))return true;
  const item=await Content.findById(contentId).select('source ownerUserId').lean();
  if(!item||item.source==='admin'||!item.ownerUserId)return true;
  const owner=await User.findById(item.ownerUserId).select('isPrivate').lean();
  if(!owner||!owner.isPrivate)return true;
  if(userId&&String(userId)===String(item.ownerUserId))return true;
  if(!userId)return false;
  return Boolean(await Follow.exists({followerId:userId,followingId:item.ownerUserId,status:'accepted'}));
}

async function enrichList(body,userId){
  if(!Array.isArray(body))return body;
  const ids=[...new Set(body.map(x=>x?.author?.id).filter(Boolean).map(String))];
  if(!ids.length)return body;
  const users=await User.find({_id:{$in:ids}}).select('_id isPrivate').lean();
  const privacy=new Map(users.map(u=>[String(u._id),Boolean(u.isPrivate)]));
  const relations=new Map();
  if(userId){
    const rows=await Follow.find({followerId:userId,followingId:{$in:ids}}).select('followingId status').lean();
    rows.forEach(r=>relations.set(String(r.followingId),r.status));
  }
  return body.filter(item=>{
    const id=item?.author?.id?String(item.author.id):'';
    if(!id)return true;
    if(String(userId||'')===id)return true;
    if(!privacy.get(id))return true;
    return relations.get(id)==='accepted';
  }).map(item=>{
    const id=item?.author?.id?String(item.author.id):'';
    if(!id)return item;
    const followStatus=String(userId||'')===id?'self':(relations.get(id)||'none');
    return {...item,author:{...item.author,isPrivate:Boolean(privacy.get(id)),followStatus}};
  });
}

async function enrichOne(body,userId){
  if(!body||Array.isArray(body)||typeof body!=='object'||!body.author?.id)return body;
  const list=await enrichList([body],userId);
  return list[0]||body;
}

async function notifyFollowers(item){
  const raw=item?.toObject?item.toObject():item;
  if(!raw||raw.type!=='post'||raw.status!=='approved'||!raw.ownerUserId)return;
  const ownerId=String(raw.ownerUserId?._id||raw.ownerUserId);
  const [owner,followers]=await Promise.all([
    User.findById(ownerId).select('name').lean(),
    Follow.find({followingId:ownerId,status:'accepted'}).select('followerId').lean()
  ]);
  if(!followers.length)return;
  const ops=followers.map(row=>({
    updateOne:{
      filter:{uniqueKey:`new-post:${raw._id}:${row.followerId}`},
      update:{$setOnInsert:{
        userId:row.followerId,
        type:'new-post',
        title:`New post from ${owner?.name||'someone you follow'}`,
        message:raw.title?`“${raw.title}”`:'A new post is available.',
        contentId:raw._id,
        actionUrl:`/view/${raw._id}`,
        uniqueKey:`new-post:${raw._id}:${row.followerId}`
      }},
      upsert:true
    }
  }));
  await Notification.bulkWrite(ops,{ordered:false}).catch(()=>{});
}

router.use(async(req,res,next)=>{try{
  const exactPublic=req.path.match(/^\/public\/([a-f\d]{24})$/i);
  const publicAction=req.path.match(/^\/public\/([a-f\d]{24})(?:\/|$)/i);
  if(publicAction){
    const allowed=await ownerAccess(publicAction[1],req.user?.userId);
    if(!allowed)return res.status(403).json({message:'This content belongs to a private account. Follow the user to view it.'});
  }

  if(req.method==='GET'&&req.path==='/'){
    const send=res.json.bind(res);
    res.json=(body)=>{Promise.resolve(enrichList(body,req.user?.userId)).then(send).catch(next);return res};
  }else if(req.method==='GET'&&exactPublic){
    const send=res.json.bind(res);
    res.json=(body)=>{Promise.resolve(enrichOne(body,req.user?.userId)).then(send).catch(next);return res};
  }else if(req.method==='POST'&&/^\/admin\/[a-f\d]{24}\/review$/i.test(req.path)&&req.body?.action==='approve'){
    const send=res.json.bind(res);
    res.json=(body)=>{Promise.resolve(notifyFollowers(body)).then(()=>send(body)).catch(next);return res};
  }
  next();
}catch(e){next(e)}});

export default router;
