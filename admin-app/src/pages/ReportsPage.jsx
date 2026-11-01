import { CheckCircle2, Eye, RefreshCw, Trash2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';

const reasonLabel={spam:'Spam','false-information':'False information',harassment:'Harassment',inappropriate:'Inappropriate content',scam:'Scam / fraud',other:'Other'};

export default function ReportsPage(){
  const [rows,setRows]=useState([]),[status,setStatus]=useState('open'),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const load=async()=>{setBusy(true);setError('');try{setRows(await api(`/reports/admin${status?`?status=${status}`:''}`))}catch(e){setError(e.message)}finally{setBusy(false)}};
  useEffect(()=>{load()},[status]);

  const act=async(row,next)=>{
    const adminNote=next==='removed'?'Removed after report review.':'';
    try{await adminApi(`/reports/admin/${row._id}`,{method:'PATCH',body:JSON.stringify({status:next,adminNote})});load()}catch(e){setError(e.message)}
  };

  return <div>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black tracking-[.16em] text-red-600">MODERATION</p><h2 className="mt-1 text-3xl font-black">Post Reports</h2><p className="mt-1 text-sm text-slate-500">Review user-reported posts. Normal publishing is direct-live; moderation happens here after reports.</p></div><button onClick={load} className="rounded-xl border bg-white p-2.5"><RefreshCw size={18}/></button></div>
    <div className="mt-5 flex gap-2">{['open','reviewed','dismissed','removed'].map(x=><button key={x} onClick={()=>setStatus(x)} className={`rounded-xl px-3 py-2 text-sm font-extrabold ${status===x?'bg-blue-600 text-white':'border bg-white text-slate-600'}`}>{x}</button>)}</div>
    {error&&<p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
    <div className="mt-5 space-y-3">
      {rows.map(row=><div key={row._id} className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase text-red-600">{reasonLabel[row.reason]||row.reason}</p><h3 className="mt-1 text-lg font-black">{row.contentId?.title||'Reported post'}</h3><p className="mt-1 text-sm text-slate-500">Reported by <b>{row.reporterId?.name||'User'}</b> • Post owner <b>{row.ownerUserId?.name||'User'}</b></p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">{row.status}</span></div>
        {row.details&&<p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">{row.details}</p>}
        {row.contentId?.mediaUrl&&<a href={row.contentId.mediaUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-black text-blue-600"><Eye size={16}/>View media</a>}
        {row.status==='open'&&<div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>act(row,'reviewed')} className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-black text-white"><CheckCircle2 size={16}/>Mark reviewed</button><button onClick={()=>act(row,'dismissed')} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-black text-slate-600"><XCircle size={16}/>Dismiss</button><button onClick={()=>confirm('Remove this post?')&&act(row,'removed')} className="flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-black text-white"><Trash2 size={16}/>Remove post</button></div>}
      </div>)}
      {!busy&&!rows.length&&<div className="rounded-3xl border bg-white p-10 text-center font-bold text-slate-400">No reports in this status.</div>}
    </div>
  </div>;
}
