import { CheckCircle2, CreditCard, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { getUserToken } from '../lib/session';

export default function MockPaymentPage(){
  const {contentId}=useParams();
  const token=getUserToken();
  const nav=useNavigate();
  const location=useLocation();
  const [item,setItem]=useState(location.state?.content||null);
  const [loading,setLoading]=useState(!location.state?.content);
  const [busy,setBusy]=useState(false);
  const [paid,setPaid]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{
    if(item)return;
    api('/content/user/mine',{token}).then(rows=>setItem(rows.find(x=>x._id===contentId)||null)).catch(e=>setError(e.message)).finally(()=>setLoading(false));
  },[contentId,item,token]);

  const amount=useMemo(()=>Number(item?.planAmount||0).toLocaleString('en-IN'),[item]);
  const pay=async()=>{setBusy(true);setError('');try{await api('/payments/mock-pay',{token,method:'POST',body:JSON.stringify({contentId})});setPaid(true);setTimeout(()=>nav('/my-submissions',{replace:true}),900)}catch(e){setError(e.message)}finally{setBusy(false)}};

  if(loading)return <main className="mx-auto max-w-xl px-4 py-10"><div className="h-80 animate-pulse rounded-3xl bg-white"/></main>;
  if(!item)return <main className="mx-auto max-w-xl px-4 py-10"><div className="rounded-3xl border bg-white p-8 text-center"><p className="font-bold text-red-600">{error||'Submission not found'}</p></div></main>;

  return <main className="mx-auto max-w-xl px-4 pb-28 pt-8 md:pb-10">
    <div className="overflow-hidden rounded-[30px] border bg-white shadow-xl shadow-blue-100/50">
      <div className="bg-gradient-to-r from-blue-700 to-sky-500 p-6 text-white">
        <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15"><CreditCard size={24}/></span><div><p className="text-xs font-extrabold tracking-[.16em] text-blue-100">TEST PAYMENT</p><h1 className="text-2xl font-black">Mock Payment</h1></div></div>
      </div>
      <div className="p-6">
        {paid?<div className="py-10 text-center"><CheckCircle2 size={62} className="mx-auto text-emerald-500"/><h2 className="mt-4 text-2xl font-black">Payment Successful</h2><p className="mt-2 text-sm text-slate-500">Mock payment completed. Sending your submission to Admin Review...</p></div>:<>
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-wider text-blue-600">{item.type}</p><h2 className="mt-1 text-xl font-black">{item.title}</h2><p className="mt-2 text-sm text-slate-500">{item.planLabel}</p>{item.planSnapshot?.billingMode==='pack'&&<p className="mt-2 rounded-xl bg-blue-50 p-3 text-xs font-semibold text-blue-700">This payment activates a {item.planSnapshot.packValidityDays}-day publishing pack • {item.planSnapshot.publishLimit==null?'Unlimited publishes':`${item.planSnapshot.publishLimit} publishes`}.</p>}{['post','shop','worker'].includes(item.type)&&item.planSnapshot?.billingMode!=='pack'&&<p className="mt-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">Approved content has no expiry and stays live until you delete it.</p>}<div className="mt-4 flex items-end justify-between border-t pt-4"><span className="text-sm font-bold text-slate-500">Payable</span><span className="text-3xl font-black text-blue-700">₹{amount}</span></div></div>
          <div className="mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><ShieldCheck className="shrink-0" size={20}/><p><b>Development mode:</b> No real money will be charged. This button only marks the payment as successful for testing.</p></div>
          {error&&<p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
          <button disabled={busy} onClick={pay} className="mt-5 w-full rounded-2xl bg-blue-600 px-5 py-3.5 font-extrabold text-white shadow-lg shadow-blue-100 disabled:opacity-50">{busy?'Processing...':`Pay ₹${amount} (Mock)`}</button>
          <button onClick={()=>nav('/my-submissions')} className="mt-2 w-full rounded-2xl border px-5 py-3 text-sm font-extrabold text-slate-600">Pay Later</button>
        </>}
      </div>
    </div>
  </main>
}
