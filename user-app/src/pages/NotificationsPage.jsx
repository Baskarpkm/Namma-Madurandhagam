import { AlertTriangle, Bell, CheckCheck, Clock3, Megaphone, RotateCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import EmptyState from '../components/EmptyState';
import { getUser, getUserToken } from '../lib/session';
import { getReadPublicAlertIds, markAllPublicAlertsRead, markPublicAlertRead } from '../lib/alertState';

const timeOf = (row) => new Date(row?.createdAt || row?.publishedAt || 0).getTime();
const when = (date) => date ? new Date(date).toLocaleString('en-IN', {dateStyle:'medium', timeStyle:'short'}) : '';

export default function NotificationsPage(){
  const token=getUserToken(),user=getUser(),nav=useNavigate();
  const [personal,setPersonal]=useState([]),[publicItems,setPublicItems]=useState([]),[error,setError]=useState(''),[refreshKey,setRefreshKey]=useState(0);

  const load=()=>Promise.all([api('/notifications',{token}),api('/content?type=incident',{token})])
    .then(([a,b])=>{setPersonal(a||[]);setPublicItems(b||[])})
    .catch(e=>setError(e.message));

  useEffect(()=>{load()},[]);
  useEffect(()=>{
    const refresh=()=>setRefreshKey(x=>x+1);
    window.addEventListener('nm-alert-read',refresh);
    return()=>window.removeEventListener('nm-alert-read',refresh);
  },[]);

  const readPublic=useMemo(()=>getReadPublicAlertIds(user?.id),[user?.id,refreshKey,publicItems]);
  const rows=useMemo(()=>[
    ...personal.map(x=>({...x,kind:'personal',sortAt:timeOf(x)})),
    ...publicItems.map(x=>({...x,kind:'public',message:x.description||'',sortAt:timeOf(x)})),
  ].sort((a,b)=>b.sortAt-a.sortAt),[personal,publicItems]);

  const navigateTo=(url)=>{
    if(!url)return;
    if(/^https?:\/\//i.test(url)){window.location.assign(url);return}
    nav(url);
  };

  const open=async row=>{
    if(row.kind==='personal'){
      if(!row.readAt){
        await api(`/notifications/${row._id}/read`,{token,method:'PATCH'}).catch(()=>{});
        setPersonal(list=>list.map(x=>x._id===row._id?{...x,readAt:new Date().toISOString()}:x));
        window.dispatchEvent(new CustomEvent('nm-alert-read'));
      }
      const target=row.actionUrl||(row.contentId?`/view/${row.contentId}`:'');
      if(target)navigateTo(target);
      return;
    }

    markPublicAlertRead(user?.id,row._id);
    const target=row.linkUrl||`/view/${row._id}`;
    navigateTo(target);
  };

  const readAll=async()=>{
    await api('/notifications/read-all',{token,method:'POST'}).catch(()=>{});
    markAllPublicAlertsRead(user?.id,publicItems);
    await load();
    window.dispatchEvent(new CustomEvent('nm-alert-read'));
  };

  const hasUnread=personal.some(x=>!x.readAt)||publicItems.some(x=>!readPublic.has(String(x._id)));

  return <main className="mx-auto max-w-3xl px-4 pb-24 pt-6">
    <div className="flex items-end justify-between gap-3">
      <div><h1 className="text-2xl font-black">Notifications & Alerts</h1><p className="mt-1 text-sm text-slate-500">Newest alerts and account messages always appear first.</p></div>
      {hasUnread&&<button onClick={readAll} className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-extrabold text-blue-700"><CheckCheck size={16}/>Read all</button>}
    </div>

    {error&&<p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

    <div className="mt-5 space-y-3">
      {rows.map(row=>{
        const unread=row.kind==='personal'?!row.readAt:!readPublic.has(String(row._id));
        const date=row.createdAt||row.publishedAt;
        return <button key={`${row.kind}-${row._id}`} onClick={()=>open(row)} className={`flex w-full gap-3 rounded-3xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 ${unread?'border-orange-200 bg-orange-50/70':'bg-white'}`}>
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${row.kind==='public'?'bg-amber-50 text-amber-600':row.type==='expiry'?'bg-orange-100 text-orange-600':'bg-blue-50 text-blue-600'}`}>
            {row.kind==='public'?<AlertTriangle size={21}/>:row.type==='expiry'?<Clock3 size={21}/>:row.type==='approval'?<CheckCheck size={21}/>:row.type==='general'?<Megaphone size={21}/>:<Bell size={21}/>} 
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2"><p className="font-extrabold">{row.title}</p>{unread&&<span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500"/>}</div>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{row.message||row.description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-400">
              <span>{when(date)}</span>
              {(row.actionUrl||row.linkUrl||row.contentId||row.kind==='public')&&<span className="font-extrabold text-blue-600">Tap to open</span>}
              {row.type==='expiry'&&<span className="inline-flex items-center gap-1 font-extrabold text-orange-600"><RotateCw size={13}/>Renew now</span>}
            </div>
          </div>
        </button>
      })}
      {!rows.length&&<EmptyState title="No alerts right now" text="Renewal reminders, messages and important announcements will appear here."/>}
    </div>
  </main>
}
