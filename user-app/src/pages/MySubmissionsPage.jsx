import { CreditCard, Edit3, Eye, RefreshCw, RotateCw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { getUserToken } from '../lib/session';

const badge={approved:'bg-emerald-50 text-emerald-700',pending:'bg-amber-50 text-amber-700','payment-pending':'bg-orange-50 text-orange-700','changes-required':'bg-purple-50 text-purple-700',rejected:'bg-red-50 text-red-700',expired:'bg-slate-100 text-slate-600',applied:'bg-blue-50 text-blue-700'};
const paymentBadge={paid:'bg-emerald-50 text-emerald-700',pending:'bg-amber-50 text-amber-700',refunded:'bg-blue-50 text-blue-700',failed:'bg-red-50 text-red-700'};
const DAY=24*60*60*1000;
function renewalAvailable(item){
  if(!item.renewalAllowed||['status','post','shop','worker','event'].includes(item.type))return false;
  const now=Date.now();
  if(item.status==='approved'&&item.expiresAt){const left=new Date(item.expiresAt).getTime()-now;return left>0&&left<=3*DAY;}
  return item.status==='expired'&&item.renewalGraceUntil&&new Date(item.renewalGraceUntil).getTime()>now;
}
export default function MySubmissionsPage(){
  const token=getUserToken(),nav=useNavigate();
  const [items,setItems]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState('');
  const load=()=>api('/content/user/mine',{token}).then(setItems).catch(e=>setError(e.message));
  useEffect(()=>{load()},[]);
  const pay=(item)=>nav(`/mock-payment/${item._id}`,{state:{content:item}});
  const renew=async(item)=>{setBusy(item._id);setError('');try{const next=await api(`/content/user/${item._id}/renew`,{token,method:'POST',body:JSON.stringify({planCode:item.planCode})});if(next.paymentStatus==='paid'&&Number(next.planAmount||0)===0)load();else nav(`/mock-payment/${next._id}`,{state:{content:next}})}catch(e){setError(e.message)}finally{setBusy('')}};
  const remove=async(item)=>{if(!confirm(`Delete “${item.title}”? This cannot be undone.`))return;setBusy(item._id);setError('');try{await api(`/content/user/${item._id}`,{token,method:'DELETE'});await load()}catch(e){setError(e.message)}finally{setBusy('')}};

  return <main className="mx-auto max-w-4xl px-4 pb-28 pt-6 md:pb-10">
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className="text-xs font-black tracking-[.16em] text-blue-600">ACCOUNT</p>
        <h1 className="mt-1 text-3xl font-black">My Submissions</h1>
        <p className="mt-1 text-sm text-slate-500">Track Pending, Approved, Paid and other submission/payment states here. Your approved photo/video posts also appear separately under My Posts.</p>
      </div>
      <button onClick={load} className="rounded-xl border bg-white p-2.5"><RefreshCw size={18}/></button>
    </div>

    {error&&<p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

    <div className="mt-5 space-y-4">{items.map(item=>{
      const canRenew=renewalAvailable(item);
      const daysLeft=item.status==='approved'&&item.expiresAt?Math.max(0,Math.ceil((new Date(item.expiresAt)-Date.now())/DAY)):null;
      const isEdit=Boolean(item.editOf||item.meta?.isEditRequest);
      return <article key={item._id} className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex gap-4">
          {item.mediaUrl&&(item.mediaType==='video'?<video src={item.mediaUrl} className="h-24 w-28 rounded-2xl bg-black object-cover"/>:<img src={item.mediaUrl} className="h-24 w-28 rounded-2xl object-cover"/>)}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><p className="text-xs font-black uppercase tracking-wider text-blue-600">{isEdit?'Edit Request':item.type}</p><h2 className="mt-1 text-lg font-black">{item.title}</h2></div>
              <div className="flex flex-wrap justify-end gap-1.5">
                <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${badge[item.status]||'bg-slate-100 text-slate-600'}`}>{item.status}</span>
                {item.paymentStatus&&<span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${paymentBadge[item.paymentStatus]||'bg-slate-100 text-slate-600'}`}>Payment: {item.paymentStatus}</span>}
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-500">{item.planLabel||'No plan'} {Number(item.planAmount||0)>0?`• ₹${Number(item.planAmount).toLocaleString('en-IN')}`:''}</p>
            {item.status==='approved'&&!item.expiresAt&&<p className="mt-2 text-xs font-semibold text-emerald-700">No expiry • stays live until you delete it</p>}
            {item.reviewNote&&<p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><b>Admin:</b> {item.reviewNote}</p>}
            {item.status==='approved'&&item.expiresAt&&<p className={`mt-2 text-xs font-semibold ${daysLeft<=3&&item.renewalAllowed?'text-orange-600':'text-emerald-700'}`}>Live until {new Date(item.expiresAt).toLocaleDateString()} {item.renewalAllowed&&daysLeft<=3?`• ${daysLeft} day${daysLeft===1?'':'s'} left`:''}</p>}
            {item.status==='expired'&&<p className="mt-2 text-xs text-slate-500">Expired from public view. This history remains until you delete it.</p>}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {item.status==='payment-pending'&&<button onClick={()=>pay(item)} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-extrabold text-white"><CreditCard size={17}/>Pay Mock</button>}
          {item.status==='changes-required'&&<button onClick={()=>nav('/post',{state:{resubmit:item}})} className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-extrabold text-white"><Edit3 size={17}/> Update & Resubmit</button>}
          {item.status==='approved'&&<button onClick={()=> item.type==='offer' ? nav(`/offer/${item._id}`) : nav(`/view/${item._id}`)} className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-extrabold text-blue-700"><Eye size={17}/> View Live</button>}
          {item.status==='approved'&&['shop','worker'].includes(item.type)&&<button onClick={()=>nav('/post',{state:{editOriginal:item}})} className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-extrabold text-white"><Edit3 size={17}/> Edit Listing</button>}
          {canRenew&&<button disabled={busy===item._id} onClick={()=>renew(item)} className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-extrabold text-white"><RotateCw size={17}/>{busy===item._id?'Preparing...':'Renew Plan'}</button>}
          <button disabled={busy===item._id} onClick={()=>remove(item)} className="ml-auto flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-extrabold text-red-700"><Trash2 size={17}/>Delete</button>
        </div>
      </article>
    })}
    {!items.length&&<div className="rounded-3xl border bg-white p-10 text-center text-sm text-slate-400">No submissions yet. Use the + Post button to create your first submission.</div>}
    </div>
  </main>
}
