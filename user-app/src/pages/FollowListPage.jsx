import { ArrowLeft, Lock, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { getUser, getUserToken } from '../lib/session';
import UserAvatar from '../components/UserAvatar';
import EmptyState from '../components/EmptyState';

export default function FollowListPage({mode}){
  const {userId}=useParams(),token=getUserToken(),me=getUser(),nav=useNavigate();
  const [items,setItems]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  useEffect(()=>{setLoading(true);setError('');api(`/social/profiles/${userId}/${mode}`,{token}).then(r=>setItems(r.items||[])).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[userId,mode]);
  const title=mode==='followers'?'Followers':'Following';
  const own=String(me?.id||'')===String(userId);
  return <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
    <div className="flex items-center justify-between gap-3"><button onClick={()=>nav(-1)} className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-bold text-slate-600"><ArrowLeft size={17}/>Back</button>{own&&mode==='followers'&&<Link to="/follow-requests" className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-extrabold text-blue-700"><UserPlus size={15}/>Requests</Link>}</div>
    <h1 className="mt-5 text-2xl font-black">{title}</h1>
    {loading?<div className="mt-4 h-40 animate-pulse rounded-3xl bg-white"/>:error?<div className="mt-4 rounded-3xl border bg-white p-8 text-center"><Lock className="mx-auto text-slate-400"/><p className="mt-3 font-bold text-slate-700">{error}</p></div>:items.length?<div className="mt-4 overflow-hidden rounded-3xl border bg-white">{items.map((user,index)=><Link key={user.id} to={`/profile/${user.id}`} className={`flex items-center gap-3 p-4 hover:bg-slate-50 ${index?'border-t':''}`}><UserAvatar user={user} sizeClass="h-12 w-12" iconSize={21}/><div className="min-w-0 flex-1"><p className="truncate font-black text-slate-900">{user.name}</p><p className="truncate text-xs font-semibold text-slate-400">{user.village||'Namma Madurandhagam member'}</p></div>{user.isPrivate&&<Lock size={15} className="text-slate-400"/>}</Link>)}</div>:<EmptyState title={`No ${title.toLowerCase()} yet`} text="Users will appear here when this list has members."/>}
  </main>;
}
