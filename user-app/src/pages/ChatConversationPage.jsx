import { ArrowLeft, ImagePlus, Phone, Send, UploadCloud, Video, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { getUserToken } from '../lib/session';
import UserAvatar from '../components/UserAvatar';
import BrandLogo from '../components/BrandLogo';

function MediaViewer({media,onClose}){
  if(!media)return null;
  return <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/95 p-3" onClick={onClose}>
    <button type="button" onClick={onClose} className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white"><X size={24}/></button>
    <div className="flex max-h-full max-w-5xl items-center justify-center" onClick={e=>e.stopPropagation()}>
      {media.type==='video'?<video src={media.url} controls autoPlay playsInline className="max-h-[92dvh] max-w-full bg-black object-contain"/>:<img src={media.url} alt="Chat attachment" className="max-h-[92dvh] max-w-full object-contain"/>}
    </div>
  </div>;
}

export default function ChatConversationPage(){
  const {peerId}=useParams(),token=getUserToken(),nav=useNavigate();
  const [data,setData]=useState({peer:null,messages:[]});
  const [text,setText]=useState(''),[error,setError]=useState(''),[uploading,setUploading]=useState(false),[viewer,setViewer]=useState(null);
  const bottom=useRef(null);
  const initialized=useRef(false);

  const load=()=>api(`/chat/user/conversation/${peerId}`,{token,fresh:true})
    .then(next=>{setData(next);setError('')})
    .catch(e=>setError(e.message));

  useEffect(()=>{
    initialized.current=false;
    load().finally(()=>{initialized.current=true});
    const id=setInterval(load,2500);
    const onFocus=()=>load();
    window.addEventListener('focus',onFocus);
    return()=>{clearInterval(id);window.removeEventListener('focus',onFocus)};
  },[peerId]);

  const messages=data?.messages||[];
  const peer=data?.peer;
  const lastId=messages.length?messages[messages.length-1]._id:'';

  useEffect(()=>{
    if(!lastId)return;
    bottom.current?.scrollIntoView({behavior:initialized.current?'smooth':'auto',block:'nearest'});
  },[lastId]);

  const sendPayload=async payload=>{
    await api(`/chat/user/conversation/${peerId}`,{token,method:'POST',body:JSON.stringify(payload)});
    setText('');
    await load();
  };

  const send=async e=>{
    e.preventDefault();
    if(!text.trim()||uploading||peer?.canMessage===false)return;
    try{await sendPayload({message:text.trim()})}catch(e){setError(e.message)}
  };

  const upload=async file=>{
    if(!file||peer?.canMessage===false)return;
    setUploading(true);setError('');
    try{
      const fd=new FormData();fd.append('file',file);
      const result=await api('/upload/user/short',{token,method:'POST',body:fd});
      await sendPayload({message:text.trim(),mediaUrl:result.url,mediaType:result.resourceType==='video'?'video':'image'});
    }catch(e){setError(e.message)}
    finally{setUploading(false)}
  };

  const canSend=Boolean(peer)&&(peer.type==='admin'||peer.canMessage!==false);

  return <>
    <main className="fixed inset-0 z-[100] flex h-dvh flex-col overflow-hidden bg-[#eef3f8]">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 py-3 shadow-sm sm:px-4">
        <button type="button" onClick={()=>nav('/chat')} className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl border text-slate-600 md:grid" aria-label="Back to chats"><ArrowLeft size={19}/></button>
        {peer?.type==='admin'?<BrandLogo className="h-11 w-11" rounded="rounded-full"/>:<UserAvatar user={peer} sizeClass="h-11 w-11" iconSize={20}/>} 
        <div className="min-w-0 flex-1">
          <p className="truncate font-black text-slate-900">{peer?.name||'Chat'}</p>
          <p className="truncate text-xs font-semibold text-slate-400">{peer?.username?`@${peer.username}`:(peer?.village||'')}</p>
        </div>
        {peer?.type==='user'&&peer?.canCall&&peer?.callHref&&<a href={peer.callHref} className="grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-700" aria-label="Call user"><Phone size={19}/></a>}
      </header>

      {error&&<p className="shrink-0 border-b border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <section className="min-h-0 flex-1 overflow-y-auto px-3 py-4 overscroll-contain sm:px-4">
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-end space-y-1.5">
          {!messages.length&&<div className="flex flex-1 items-center justify-center px-4 py-8 text-center text-sm text-slate-400">No messages yet. Start the conversation.</div>}
          {messages.map(x=><div key={x._id} className={`flex ${x.isMine?'justify-end':'justify-start'}`}>
            <div className={`max-w-[84%] overflow-hidden rounded-2xl text-sm leading-6 shadow-sm ${x.isMine?'rounded-br-md bg-blue-600 text-white':'rounded-bl-md bg-white text-slate-700'}`}>
              {x.mediaUrl&&<button type="button" onClick={()=>setViewer({url:x.mediaUrl,type:x.mediaType})} className="block w-full cursor-zoom-in bg-black/5 text-left">
                {x.mediaType==='video'?<video src={x.mediaUrl} muted playsInline preload="metadata" className="max-h-72 w-full bg-black object-contain"/>:<img src={x.mediaUrl} alt="Chat attachment" className="max-h-72 w-full object-contain"/>}
              </button>}
              {x.message&&<p className="whitespace-pre-wrap break-words px-3 pb-0.5 pt-2">{x.message}</p>}
              <span className={`block px-3 pb-1.5 text-[9px] ${x.isMine?'text-blue-100':'text-slate-400'}`}>{new Date(x.createdAt).toLocaleString('en-IN')}</span>
            </div>
          </div>)}
          <div ref={bottom}/>
        </div>
      </section>

      {!canSend&&<div className="shrink-0 border-t border-amber-100 bg-amber-50 px-4 py-2 text-center text-xs font-bold text-amber-700">This user has turned off direct messages. You can still read this conversation.</div>}

      <div className="shrink-0 border-t border-slate-200 bg-white p-2 shadow-[0_-6px_20px_rgba(15,23,42,0.05)] sm:p-3">
        <form onSubmit={send} className="mx-auto flex w-full max-w-4xl items-center gap-1.5">
          <label title="Send image" className={`cursor-pointer rounded-xl p-2 text-slate-500 ${uploading||!canSend?'pointer-events-none opacity-40':''}`}><ImagePlus size={20}/><input type="file" accept="image/*" className="hidden" onChange={e=>{upload(e.target.files?.[0]);e.target.value=''}}/></label>
          <label title="Send video up to 30 seconds" className={`cursor-pointer rounded-xl p-2 text-slate-500 ${uploading||!canSend?'pointer-events-none opacity-40':''}`}><Video size={20}/><input type="file" accept="video/*" className="hidden" onChange={e=>{upload(e.target.files?.[0]);e.target.value=''}}/></label>
          {uploading&&<UploadCloud size={18} className="animate-pulse text-blue-600"/>}
          <input disabled={!canSend} value={text} onChange={e=>setText(e.target.value)} className="min-w-0 flex-1 rounded-xl bg-slate-50 px-3 py-2.5 outline-none ring-1 ring-slate-200 focus:ring-blue-300 disabled:bg-white disabled:text-slate-400" placeholder={canSend?`Message ${peer?.name||''}...`:'Messaging is off'}/>
          <button type="submit" disabled={uploading||!canSend||!text.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-600 text-white disabled:opacity-40"><Send size={19}/></button>
        </form>
      </div>
    </main>
    <MediaViewer media={viewer} onClose={()=>setViewer(null)}/>
  </>;
}
