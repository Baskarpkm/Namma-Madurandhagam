import { ChevronRight, Image, MessageCircle, RefreshCw, Search, Video } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../lib/api';

const when = (date) => date ? new Date(date).toLocaleString('en-IN', {dateStyle:'medium', timeStyle:'short'}) : '';

export default function ChatInboxPage(){
  const nav=useNavigate();
  const [rows,setRows]=useState([]);
  const [query,setQuery]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);

  const load=()=>{
    setError('');
    return adminApi('/chat/admin').then(setRows).catch(e=>setError(e.message)).finally(()=>setLoading(false));
  };

  useEffect(()=>{
    load();
    const id=setInterval(load,5000);
    return ()=>clearInterval(id);
  },[]);

  const conversations=useMemo(()=>{
    const map=new Map();
    for(const msg of rows){
      const user=msg.userId&&typeof msg.userId==='object'?msg.userId:null;
      const id=user?._id||msg.userId;
      if(!id)continue;
      const prev=map.get(String(id));
      if(!prev||new Date(msg.createdAt)>new Date(prev.latest.createdAt)){
        map.set(String(id),{id:String(id),user:user||prev?.user||null,latest:msg});
      }else if(user&&!prev?.user){
        map.set(String(id),{...prev,user});
      }
    }
    return [...map.values()].sort((a,b)=>new Date(b.latest.createdAt)-new Date(a.latest.createdAt));
  },[rows]);

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    if(!q)return conversations;
    return conversations.filter(x=>`${x.user?.name||''} ${x.user?.mobile||''} ${x.user?.village||''}`.toLowerCase().includes(q));
  },[conversations,query]);

  const preview=(msg)=>{
    if(msg.mediaUrl&&msg.mediaType==='video')return <span className="flex items-center gap-1"><Video size={13}/> Video</span>;
    if(msg.mediaUrl)return <span className="flex items-center gap-1"><Image size={13}/> Photo</span>;
    return msg.message||'Message';
  };

  return <section>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-black tracking-[.16em] text-blue-600">SUPPORT</p>
        <h2 className="mt-1 text-3xl font-black">Chat Inbox</h2>
        <p className="mt-1 text-sm text-slate-500">Only users who already have a conversation appear here. Tap a user to open the chat.</p>
      </div>
      <button onClick={load} className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-extrabold text-slate-600"><RefreshCw size={17}/> Refresh</button>
    </div>

    {error&&<p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

    <div className="mt-5 flex items-center gap-2 rounded-2xl border bg-white px-4 py-3 shadow-sm">
      <Search size={18} className="text-slate-400"/>
      <input value={query} onChange={e=>setQuery(e.target.value)} className="w-full outline-none" placeholder="Search conversation by name, mobile or village..."/>
    </div>

    <div className="mt-5 overflow-hidden rounded-3xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-400">
        <span>Conversations</span>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">{conversations.length} users</span>
      </div>

      {loading?<div className="space-y-1 p-3">{[1,2,3].map(i=><div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100"/>)}</div>:filtered.length?filtered.map(({id,user,latest})=><button key={id} type="button" onClick={()=>nav(`/chat/${id}`)} className="flex w-full items-center gap-3 border-b px-4 py-4 text-left transition last:border-b-0 hover:bg-blue-50/50">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blue-600 text-base font-black text-white">{String(user?.name||'U').trim().charAt(0).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><p className="truncate font-black text-slate-900">{user?.name||'User'}</p><span className="ml-auto shrink-0 text-[10px] font-semibold text-slate-400">{when(latest.createdAt)}</span></div>
          <p className="mt-0.5 truncate text-xs font-semibold text-slate-400">{user?.mobile||''}{user?.village?` • ${user.village}`:''}</p>
          <div className={`mt-1 truncate text-sm ${latest.sender==='user'?'font-bold text-slate-700':'text-slate-500'}`}>{latest.sender==='admin'&&<span className="mr-1 text-blue-600">You:</span>}{preview(latest)}</div>
        </div>
        <ChevronRight size={19} className="shrink-0 text-slate-300"/>
      </button>):<div className="grid min-h-56 place-items-center p-8 text-center"><div><MessageCircle className="mx-auto text-slate-300" size={42}/><p className="mt-3 font-black text-slate-600">No conversations yet</p><p className="mt-1 text-sm text-slate-400">A user will appear here after they send the first message.</p></div></div>}
    </div>
  </section>
}
