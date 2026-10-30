import { AtSign, ChevronRight, Image, MessageCircle, Search, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { getUserToken } from '../lib/session';
import UserAvatar from '../components/UserAvatar';
import BrandLogo from '../components/BrandLogo';

const when=date=>date?new Date(date).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'';

export default function ChatPage(){
  const token=getUserToken(),nav=useNavigate();
  const [rows,setRows]=useState([]),[query,setQuery]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true);

  const load=()=>api('/chat/user/conversations',{token,fresh:true}).then(data=>{setRows(data||[]);setError('')}).catch(e=>setError(e.message)).finally(()=>setLoading(false));
  useEffect(()=>{load();const id=setInterval(load,3000);const onFocus=()=>load();window.addEventListener('focus',onFocus);return()=>{clearInterval(id);window.removeEventListener('focus',onFocus)}},[]);

  const ordered=useMemo(()=>{
    const admin=rows.find(x=>x.peerType==='admin');
    const users=rows.filter(x=>x.peerType!=='admin').sort((a,b)=>new Date(b.lastMessage?.createdAt||0)-new Date(a.lastMessage?.createdAt||0));
    return admin?[admin,...users]:users;
  },[rows]);

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    if(!q)return ordered;
    return ordered.filter(x=>`${x.name||''} ${x.username||''} ${x.village||''}`.toLowerCase().includes(q));
  },[ordered,query]);

  const preview=row=>{
    const last=row.lastMessage;
    if(!last)return row.peerType==='admin'?'Tap to chat with Admin':'No messages yet';
    const prefix=last.isMine?'You: ':'';
    if(last.mediaType==='video')return `${prefix}Video`;
    if(last.mediaType==='image')return `${prefix}Photo`;
    return `${prefix}${last.message||'Message'}`;
  };

  return <main className="fixed inset-x-0 bottom-[68px] top-[69px] z-30 flex flex-col overflow-hidden bg-[#f6f9ff] md:static md:mx-auto md:h-[calc(100dvh-69px)] md:max-w-3xl md:px-4 md:pb-3 md:pt-3">
    <header className="shrink-0 border-b bg-white px-4 py-3 md:rounded-t-3xl md:border md:border-b-0">
      <div className="flex items-center gap-3"><div className="min-w-0 flex-1"><h1 className="text-xl font-black">Chats</h1><p className="text-xs text-slate-500">Admin stays first. Latest user conversation stays directly below it.</p></div><MessageCircle className="text-blue-600" size={24}/></div>
      <div className="mt-3 flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2.5"><Search size={17} className="text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name or username..." className="w-full bg-transparent text-sm outline-none"/></div>
    </header>

    {error&&<p className="shrink-0 border-x border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    <section className="min-h-0 flex-1 overflow-y-auto bg-white md:border-x">
      {loading?<div className="space-y-1 p-2">{[1,2,3].map(i=><div key={i} className="h-[68px] animate-pulse rounded-xl bg-slate-100"/>)}</div>:filtered.map(row=><button key={row.peerId} type="button" onClick={()=>nav(`/chat/${row.peerId}`)} className="flex w-full items-center gap-3 border-b px-4 py-2.5 text-left transition hover:bg-blue-50/40">
        <div className="relative shrink-0">{row.peerType==='admin'?<BrandLogo className="h-11 w-11" rounded="rounded-full"/>:<UserAvatar user={row} sizeClass="h-11 w-11" iconSize={20}/>} {row.peerType==='admin'&&<span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-blue-600 text-white ring-2 ring-white"><ShieldCheck size={12}/></span>}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><p className="truncate text-[15px] font-black text-slate-900">{row.name}</p><span className="ml-auto shrink-0 text-[10px] font-semibold text-slate-400">{when(row.lastMessage?.createdAt)}</span></div>
          {row.peerType==='user'&&row.username?<p className="flex items-center gap-0.5 truncate text-[11px] font-bold text-blue-500"><AtSign size={10}/>{row.username}</p>:<p className="truncate text-[11px] font-semibold text-slate-400">{row.village||''}</p>}
          <p className={`truncate text-[13px] leading-5 ${row.unreadCount>0?'font-black text-slate-900':'text-slate-500'}`}>{preview(row)}</p>
        </div>
        {row.unreadCount>0&&<span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-blue-600 px-1.5 text-[10px] font-black text-white">{row.unreadCount>99?'99+':row.unreadCount}</span>}
        <ChevronRight size={17} className="shrink-0 text-slate-300"/>
      </button>)}
      {!loading&&!filtered.length&&<div className="grid min-h-64 place-items-center p-8 text-center"><div><Image className="mx-auto text-slate-300" size={38}/><p className="mt-3 font-black text-slate-600">No chats found</p></div></div>}
    </section>
  </main>;
}
