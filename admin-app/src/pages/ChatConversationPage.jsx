import { ArrowLeft, ImagePlus, Send, UploadCloud, Video, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../lib/api';
import AdminUserAvatar from '../components/AdminUserAvatar';

function MediaViewer({media,onClose}){
  if(!media)return null;
  return <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/95 p-3" onClick={onClose}>
    <button type="button" onClick={onClose} className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white backdrop-blur"><X size={24}/></button>
    <div className="flex max-h-full max-w-5xl items-center justify-center" onClick={e=>e.stopPropagation()}>
      {media.type==='video'?<video src={media.url} controls autoPlay playsInline className="max-h-[92dvh] max-w-full bg-black object-contain"/>:<img src={media.url} alt="Chat attachment" className="max-h-[92dvh] max-w-full object-contain"/>}
    </div>
  </div>
}

export default function ChatConversationPage(){
  const {userId}=useParams();
  const nav=useNavigate();
  const [rows,setRows]=useState([]);
  const [text,setText]=useState('');
  const [error,setError]=useState('');
  const [uploading,setUploading]=useState(false);
  const [viewer,setViewer]=useState(null);
  const bottom=useRef(null);

  const load=()=>adminApi('/chat/admin',{cache:'no-store'}).then(setRows).catch(e=>setError(e.message));
  useEffect(()=>{load();const id=setInterval(load,3000);const onFocus=()=>load();window.addEventListener('focus',onFocus);return()=>{clearInterval(id);window.removeEventListener('focus',onFocus)}},[userId]);

  const messages=useMemo(()=>rows.filter(x=>String(x.userId?._id||x.userId)===String(userId)).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)),[rows,userId]);
  const chatUser=messages.find(x=>x.userId&&typeof x.userId==='object')?.userId||null;
  const lastMessageId=messages.length?messages[messages.length-1]._id:'';
  useEffect(()=>{bottom.current?.scrollIntoView({behavior:'smooth',block:'nearest'})},[lastMessageId]);

  const sendPayload=async(payload)=>{
    await adminApi('/chat/admin/reply',{method:'POST',body:JSON.stringify({userId,...payload})});
    setText('');
    load();
  };

  const send=async e=>{
    e.preventDefault();
    if(!text.trim())return;
    try{await sendPayload({message:text.trim()})}catch(e){setError(e.message)}
  };

  const upload=async(file)=>{
    if(!file)return;
    setUploading(true);setError('');
    try{
      const fd=new FormData();fd.append('file',file);
      const result=await adminApi('/upload',{method:'POST',body:fd});
      await sendPayload({message:text.trim(),mediaUrl:result.url,mediaType:result.resourceType==='video'?'video':'image'});
    }catch(e){setError(e.message)}finally{setUploading(false)}
  };

  return <>
    <section className="fixed inset-0 z-[100] flex h-dvh flex-col overflow-hidden bg-[#eef3f8]">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 py-3 shadow-sm sm:px-4">
        <button type="button" onClick={()=>nav('/chat')} className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl border text-slate-600 md:grid" aria-label="Back to chat inbox"><ArrowLeft size={19}/></button>
        <AdminUserAvatar user={chatUser||{name:'User'}} size="h-11 w-11"/>
        <div className="min-w-0 flex-1"><p className="truncate font-black text-slate-900">{chatUser?.name||'User Conversation'}</p><p className="truncate text-xs font-semibold text-slate-400">{chatUser?.village||''}</p></div>
      </header>

      {error&&<p className="shrink-0 border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-end space-y-1.5">
          {messages.length===0&&<div className="grid flex-1 place-items-center text-sm text-slate-400">No messages found for this conversation.</div>}
          {messages.map(x=><div key={x._id} className={`flex ${x.sender==='admin'?'justify-end':'justify-start'}`}>
            <div className={`max-w-[84%] overflow-hidden rounded-2xl text-sm leading-6 shadow-sm ${x.sender==='admin'?'rounded-br-md bg-blue-600 text-white':'rounded-bl-md bg-white text-slate-700'}`}>
              {x.mediaUrl&&<button type="button" onClick={()=>setViewer({url:x.mediaUrl,type:x.mediaType})} className="block w-full cursor-zoom-in bg-black/5 text-left">{x.mediaType==='video'?<video src={x.mediaUrl} muted playsInline preload="metadata" className="max-h-80 w-full bg-black object-contain"/>:<img src={x.mediaUrl} alt="Chat attachment" className="max-h-80 w-full object-contain"/>}</button>}
              {x.message&&<p className="whitespace-pre-wrap break-words px-3 pb-0.5 pt-2">{x.message}</p>}
              <span className={`block px-3 pb-1.5 text-[9px] ${x.sender==='admin'?'text-blue-100':'text-slate-400'}`}>{new Date(x.createdAt).toLocaleString('en-IN')}</span>
            </div>
          </div>)}
          <div ref={bottom}/>
        </div>
      </div>

      <div className="shrink-0 border-t bg-white p-2 sm:p-3">
        <form onSubmit={send} className="mx-auto flex w-full max-w-4xl items-center gap-1.5">
          <label title="Send image" className={`cursor-pointer rounded-xl p-2 text-slate-500 hover:bg-slate-100 ${uploading?'pointer-events-none opacity-40':''}`}><ImagePlus size={20}/><input type="file" accept="image/*" className="hidden" onChange={e=>{upload(e.target.files?.[0]);e.target.value=''}}/></label>
          <label title="Send video" className={`cursor-pointer rounded-xl p-2 text-slate-500 hover:bg-slate-100 ${uploading?'pointer-events-none opacity-40':''}`}><Video size={20}/><input type="file" accept="video/*" className="hidden" onChange={e=>{upload(e.target.files?.[0]);e.target.value=''}}/></label>
          {uploading&&<UploadCloud size={18} className="animate-pulse text-blue-600"/>}
          <input value={text} onChange={e=>setText(e.target.value)} className="min-w-0 flex-1 rounded-xl border bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-400" placeholder="Message user..."/>
          <button disabled={uploading||!userId||!text.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-600 text-white disabled:opacity-40"><Send size={19}/></button>
        </form>
      </div>
    </section>
    <MediaViewer media={viewer} onClose={()=>setViewer(null)}/>
  </>
}
