import { Router } from 'express';
import mongoose from 'mongoose';
import ChatMessage from '../models/ChatMessage.js';
import User from '../models/User.js';
import { requireAdmin, requireUser } from '../middleware/auth.js';

const router=Router();

const ADMIN_ID='admin';
const adminKey=(userId)=>`admin:${String(userId)}`;
const userKey=(a,b)=>`users:${[String(a),String(b)].sort().join(':')}`;

const cleanMediaType=(value)=>['image','video'].includes(value)?value:'none';

function validatePayload(req,res){
  const message=String(req.body?.message||'').trim();
  const mediaUrl=String(req.body?.mediaUrl||'').trim();
  if(!message&&!mediaUrl){
    res.status(400).json({message:'Message or media is required'});
    return null;
  }
  return {message,mediaUrl,mediaType:mediaUrl?cleanMediaType(req.body?.mediaType):'none'};
}

function publicPeer(user){
  return {
    id:String(user._id),
    name:user.name,
    village:user.village||'',
    gender:user.gender||'other',
    profilePhotoUrl:user.profilePhotoUrl||'',
    canMessage:Boolean(user.allowMessages),
    canCall:Boolean(user.allowCalls),
    callHref:user.allowCalls?`tel:+91${String(user.mobile||'').replace(/\D/g,'')}`:''
  };
}

function adminQuery(userId){
  return {
    userId,
    $or:[
      {kind:'admin-user'},
      {kind:null},
      {kind:{$exists:false}}
    ]
  };
}

function shapeAdminMessage(row){
  return {
    ...row,
    isMine:row.sender==='user',
    senderLabel:row.sender==='user'?'You':'Admin'
  };
}

function shapeUserMessage(row,me){
  const senderId=String(row.senderUserId?._id||row.senderUserId||'');
  return {
    ...row,
    isMine:senderId===String(me),
    senderLabel:senderId===String(me)?'You':(row.senderUserId?.name||'User')
  };
}

// Conversation list. Admin is always pinned first.
router.get('/user/conversations',requireUser,async(req,res,next)=>{try{
  const me=req.user.userId;

  const [adminRows,userRows]=await Promise.all([
    ChatMessage.find(adminQuery(me)).sort({createdAt:-1}).limit(200).lean(),
    ChatMessage.find({
      kind:'user-user',
      $or:[{senderUserId:me},{receiverUserId:me}]
    }).sort({createdAt:-1}).limit(1000).lean()
  ]);

  const adminLast=adminRows[0]||null;
  const adminUnread=adminRows.filter(x=>x.sender==='admin'&&!x.readAt).length;

  const map=new Map();
  for(const row of userRows){
    const senderId=String(row.senderUserId||'');
    const receiverId=String(row.receiverUserId||'');
    const peerId=senderId===String(me)?receiverId:senderId;
    if(!peerId)continue;

    const current=map.get(peerId);
    if(!current){
      map.set(peerId,{
        peerId,
        lastMessage:row,
        unreadCount:(receiverId===String(me)&&!row.readAt)?1:0
      });
    }else if(receiverId===String(me)&&!row.readAt){
      current.unreadCount+=1;
    }
  }

  const peerIds=[...map.keys()].filter(id=>mongoose.isValidObjectId(id));
  const users=peerIds.length
    ? await User.find({_id:{$in:peerIds},status:'active'}).select('name village gender profilePhotoUrl allowMessages allowCalls mobile').lean()
    : [];
  const userMap=new Map(users.map(u=>[String(u._id),u]));

  const userConversations=[...map.values()]
    .filter(x=>userMap.has(x.peerId))
    .map(x=>{
      const u=userMap.get(x.peerId);
      return {
        peerId:x.peerId,
        peerType:'user',
        name:u.name,
        village:u.village||'',
        gender:u.gender||'other',
        profilePhotoUrl:u.profilePhotoUrl||'',
        unreadCount:x.unreadCount,
        lastMessage:x.lastMessage?{
          message:x.lastMessage.message||'',
          mediaType:x.lastMessage.mediaType||'none',
          createdAt:x.lastMessage.createdAt,
          isMine:String(x.lastMessage.senderUserId)===String(me)
        }:null
      };
    })
    .sort((a,b)=>new Date(b.lastMessage?.createdAt||0)-new Date(a.lastMessage?.createdAt||0));

  res.json([
    {
      peerId:ADMIN_ID,
      peerType:'admin',
      name:'Namma Madurandhagam Admin',
      village:'Official Support',
      profilePhotoUrl:'',
      unreadCount:adminUnread,
      lastMessage:adminLast?{
        message:adminLast.message||'',
        mediaType:adminLast.mediaType||'none',
        createdAt:adminLast.createdAt,
        isMine:adminLast.sender==='user'
      }:null
    },
    ...userConversations
  ]);
}catch(e){next(e)}});

// Full conversation with Admin or another user.
router.get('/user/conversation/:peerId',requireUser,async(req,res,next)=>{try{
  const me=req.user.userId;
  const peerId=String(req.params.peerId||'');

  if(peerId===ADMIN_ID){
    await ChatMessage.updateMany(
      {...adminQuery(me),sender:'admin',readAt:null},
      {$set:{readAt:new Date()}}
    );
    const rows=await ChatMessage.find(adminQuery(me)).sort({createdAt:1}).lean();
    return res.json({
      peer:{id:ADMIN_ID,type:'admin',name:'Namma Madurandhagam Admin',village:'Official Support',profilePhotoUrl:'',canMessage:true,canCall:false,callHref:''},
      messages:rows.map(shapeAdminMessage)
    });
  }

  if(!mongoose.isValidObjectId(peerId))return res.status(404).json({message:'Conversation not found'});
  if(peerId===String(me))return res.status(400).json({message:'You cannot message yourself'});

  const peer=await User.findById(peerId).select('name village gender profilePhotoUrl allowMessages allowCalls mobile status').lean();
  if(!peer||peer.status!=='active')return res.status(404).json({message:'User not found'});

  const key=userKey(me,peerId);
  await ChatMessage.updateMany(
    {kind:'user-user',conversationKey:key,receiverUserId:me,readAt:null},
    {$set:{readAt:new Date()}}
  );

  const rows=await ChatMessage.find({kind:'user-user',conversationKey:key})
    .populate('senderUserId','name')
    .sort({createdAt:1})
    .lean();

  res.json({
    peer:{...publicPeer(peer),type:'user'},
    messages:rows.map(row=>shapeUserMessage(row,me))
  });
}catch(e){next(e)}});

router.post('/user/conversation/:peerId',requireUser,async(req,res,next)=>{try{
  const payload=validatePayload(req,res);if(!payload)return;
  const me=req.user.userId;
  const peerId=String(req.params.peerId||'');

  if(peerId===ADMIN_ID){
    const msg=await ChatMessage.create({
      userId:me,
      kind:'admin-user',
      conversationKey:adminKey(me),
      sender:'user',
      senderUserId:me,
      ...payload
    });
    return res.status(201).json(shapeAdminMessage(msg.toObject()));
  }

  if(!mongoose.isValidObjectId(peerId))return res.status(404).json({message:'User not found'});
  if(peerId===String(me))return res.status(400).json({message:'You cannot message yourself'});

  const target=await User.findById(peerId).select('allowMessages status').lean();
  if(!target||target.status!=='active')return res.status(404).json({message:'User not found'});
  if(!target.allowMessages)return res.status(403).json({message:'This user has turned off direct messages.'});

  const msg=await ChatMessage.create({
    kind:'user-user',
    conversationKey:userKey(me,peerId),
    sender:'user',
    senderUserId:me,
    receiverUserId:peerId,
    ...payload
  });
  res.status(201).json({...msg.toObject(),isMine:true,senderLabel:'You'});
}catch(e){next(e)}});

// Backward-compatible user <-> admin endpoints.
router.get('/user',requireUser,async(req,res,next)=>{try{
  const rows=await ChatMessage.find(adminQuery(req.user.userId)).sort({createdAt:1}).lean();
  res.json(rows);
}catch(e){next(e)}});

router.post('/user',requireUser,async(req,res,next)=>{try{
  const payload=validatePayload(req,res);if(!payload)return;
  const msg=await ChatMessage.create({
    userId:req.user.userId,
    kind:'admin-user',
    conversationKey:adminKey(req.user.userId),
    sender:'user',
    senderUserId:req.user.userId,
    ...payload
  });
  res.status(201).json(msg);
}catch(e){next(e)}});

// Admin endpoints only see admin-support conversations, never private user-user chats.
router.get('/admin',requireAdmin,async(req,res,next)=>{try{
  const rows=await ChatMessage.find({userId:{$ne:null}})
    .populate('userId','name mobile village status profilePhotoUrl gender')
    .sort({createdAt:1})
    .limit(1000)
    .lean();
  res.json(rows);
}catch(e){next(e)}});

router.post('/admin/reply',requireAdmin,async(req,res,next)=>{try{
  const {userId}=req.body||{};
  if(!userId||!mongoose.isValidObjectId(userId))return res.status(400).json({message:'Valid userId is required'});
  const payload=validatePayload(req,res);if(!payload)return;

  const target=await User.findById(userId).select('_id status').lean();
  if(!target)return res.status(404).json({message:'User not found'});

  const msg=await ChatMessage.create({
    userId,
    kind:'admin-user',
    conversationKey:adminKey(userId),
    sender:'admin',
    receiverUserId:userId,
    ...payload
  });
  res.status(201).json(msg);
}catch(e){next(e)}});

export default router;
