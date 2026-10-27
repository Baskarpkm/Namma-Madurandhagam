import { ArrowLeft, Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { getUserToken } from '../lib/session';
import UserAvatar from '../components/UserAvatar';
import EmptyState from '../components/EmptyState';

export default function FollowRequestsPage(){
  const token=getUserToken(),nav=useNavigate();
  const [items,setItems]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState('');
  const load=()=>api('/social/requests',{token}).then(r=>setItems(r.items||[])).catch(e=>setError(e.message));
  useEffect(()=>{load()},[]);
  const act=async(requestId,action)=>{setBusy(requestId);setError('');try{await api(`/social/requests/${requestId}/${action}`,{token,method:'POST'});setItems(list=>list.filter(x=>x.requestId!==requestId));window.dispatchEvent(new CustomEvent('nm-alert-read'))}catch(e){setError(e.message)}finally{setBusy('')}};
  return <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
    <button onClick={()=>nav(-1)} className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-bold text-slate-600"><ArrowLeft size={17}/>Back</button>
    <h1 className="mt-5 text-2xl font-black">Follow requests</h1><p className="mt-1 text-sm text-slate-500">Private account requests appear here. Accept or reject each request.</p>
    {error&&<p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
    {items.length?<div className="mt-5 overflow-hidden rounded-3xl border bg-white">{items.map((row,index)=><div key={row.requestId} className={`flex items-center gap-3 p-4 ${index?'border-t':''}`}><Link to={`/profile/${row.user.id}`} className="flex min-w-0 flex-1 items-center gap-3"><UserAvatar user={row.user} sizeClass="h-12 w-12" iconSize={21}/><div className="min-w-0"><p className="truncate font-black text-slate-900">{row.user.name}</p><p className="truncate text-xs font-semibold text-slate-400">{row.user.village||'Wants to follow you'}</p></div></Link><button disabled={busy===row.requestId} onClick={()=>act(row.requestId,'accept')} className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white disabled:opacity-50" title="Accept"><Check size={18}/></button><button disabled={busy===row.requestId} onClick={()=>act(row.requestId,'reject')} className="grid h-10 w-10 place-items-center rounded-xl border bg-white text-slate-600 disabled:opacity-50" title="Reject"><X size={18}/></button></div>)}</div>:<EmptyState title="No follow requests" text="New private-profile follow requests will appear here."/>}
  </main>;
}
