import { ArrowDownLeft, ArrowLeft, ArrowUpRight, PhoneMissed } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { getUserToken } from '../lib/session';
import UserAvatar from '../components/UserAvatar';

const duration=s=>{
  const n=Number(s||0);if(!n)return '';
  const m=Math.floor(n/60),sec=n%60;
  return m?`${m}m ${sec}s`:`${sec}s`;
};

export default function CallHistoryPage(){
  const token=getUserToken(),nav=useNavigate();
  const [rows,setRows]=useState([]),[loading,setLoading]=useState(true);
  useEffect(()=>{api('/calls/history',{token}).then(setRows).finally(()=>setLoading(false))},[]);
  return <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
    <div className="mb-5 flex items-center gap-3"><button onClick={()=>nav(-1)} className="rounded-xl border bg-white p-2"><ArrowLeft size={18}/></button><div><h1 className="text-2xl font-black">Call History</h1><p className="text-xs font-semibold text-slate-400">In-app audio calls only. Phone numbers are never shown.</p></div></div>
    {loading?<div className="h-28 animate-pulse rounded-3xl bg-white"/>:<div className="overflow-hidden rounded-3xl border bg-white">
      {rows.length?rows.map(row=>{
        const peer=row.isCaller?row.receiver:row.caller;
        const missed=['missed','declined','cancelled'].includes(row.status);
        return <div key={row.id} className="flex items-center gap-3 border-b p-4 last:border-b-0">
          <UserAvatar user={peer} sizeClass="h-11 w-11" iconSize={20}/>
          <div className="min-w-0 flex-1"><p className="truncate font-black text-slate-900">{peer?.name||'User'}</p><p className={`mt-0.5 flex items-center gap-1 text-xs font-bold ${missed?'text-red-500':'text-slate-400'}`}>{row.isCaller?<ArrowUpRight size={13}/>:missed?<PhoneMissed size={13}/>:<ArrowDownLeft size={13}/>} {row.isCaller?'Outgoing':'Incoming'} • {row.status}{duration(row.durationSeconds)?` • ${duration(row.durationSeconds)}`:''}</p></div>
          <p className="text-[11px] font-semibold text-slate-400">{new Date(row.createdAt).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
        </div>;
      }):<p className="p-10 text-center text-sm font-bold text-slate-400">No calls yet.</p>}
    </div>}
  </main>;
}
