import { Bell, Home, MapPin, MessageCircle, Plus, Search, UserRound, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { getUser, getUserToken } from '../lib/session';
import { getReadPublicAlertIds, markPublicAlertRead } from '../lib/alertState';

const desktopLinks = [
  ['/', Home, 'Home'],
  ['/post', Plus, 'Post'],
  ['/chat', MessageCircle, 'Chat'],
  ['/profile', UserRound, 'Profile'],
];

const when = (date) => date ? new Date(date).getTime() : 0;

export default function AppHeader(){
  const user=getUser();
  const token=getUserToken();
  const nav=useNavigate();
  const [unreadCount,setUnreadCount]=useState(0);
  const [popup,setPopup]=useState(null);
  const initialized=useRef(false);
  const lastPopupId=useRef('');

  const navigateTo = useCallback((url) => {
    if (!url) return nav('/notifications');
    if (/^https?:\/\//i.test(url)) {
      window.location.assign(url);
      return;
    }
    nav(url);
  }, [nav]);

  const loadAlerts=useCallback(async()=>{
    try{
      const [personal,publicItems]=await Promise.all([
        api('/notifications',{token}),
        api('/content?type=incident',{token}),
      ]);
      const readPublic=getReadPublicAlertIds(user?.id);
      const personalUnread=(personal||[]).filter(x=>!x.readAt).map(x=>({
        ...x,
        kind:'personal',
        popupId:`notification:${x._id}`,
        sortAt:when(x.createdAt),
      }));
      const publicUnread=(publicItems||[]).filter(x=>!readPublic.has(String(x._id))).map(x=>({
        ...x,
        kind:'public',
        message:x.description||'',
        popupId:`alert:${x._id}`,
        sortAt:when(x.publishedAt||x.createdAt),
      }));
      const unread=[...personalUnread,...publicUnread].sort((a,b)=>b.sortAt-a.sortAt);
      setUnreadCount(unread.length);

      const newest=unread[0];
      if(newest&&newest.popupId!==lastPopupId.current){
        lastPopupId.current=newest.popupId;
        setPopup(newest);
      }
      initialized.current=true;
    }catch{}
  },[token,user?.id]);

  useEffect(()=>{
    loadAlerts();
    const timer=setInterval(loadAlerts,8000);
    const onFocus=()=>loadAlerts();
    const onVisible=()=>{if(document.visibilityState==='visible')loadAlerts()};
    window.addEventListener('focus',onFocus);
    window.addEventListener('nm-alert-read',onFocus);
    document.addEventListener('visibilitychange',onVisible);
    return()=>{
      clearInterval(timer);
      window.removeEventListener('focus',onFocus);
      window.removeEventListener('nm-alert-read',onFocus);
      document.removeEventListener('visibilitychange',onVisible);
    };
  },[loadAlerts]);

  useEffect(()=>{
    if(!popup)return undefined;
    const timer=setTimeout(()=>setPopup(null),6500);
    return()=>clearTimeout(timer);
  },[popup?.popupId]);

  const openPopup=async()=>{
    if(!popup)return;
    if(popup.kind==='personal'&&!popup.readAt){
      await api(`/notifications/${popup._id}/read`,{token,method:'PATCH'}).catch(()=>{});
    }else if(popup.kind==='public'){
      markPublicAlertRead(user?.id,popup._id);
    }
    const target=popup.actionUrl||popup.linkUrl||(popup.contentId?`/view/${popup.contentId}`:popup.kind==='public'?`/view/${popup._id}`:'/notifications');
    setPopup(null);
    loadAlerts();
    navigateTo(target);
  };

  return <>
    <header className="sticky top-0 z-40 border-b border-blue-100/70 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <button onClick={()=>nav('/')} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-700 to-sky-500 font-black text-white shadow-lg shadow-blue-100">NM</button>
        <div className="min-w-0 flex-1 md:flex-none">
          <p className="text-[11px] font-extrabold tracking-[.18em] text-blue-600">NAMMA MADURANDHAGAM</p>
          <p className="flex items-center gap-1 truncate text-sm font-bold text-slate-700"><MapPin size={14} className="text-blue-500"/>{user?.village||'Madurandhagam'}</p>
        </div>

        <nav className="ml-4 hidden flex-1 items-center justify-center gap-1 md:flex">
          {desktopLinks.map(([to,Icon,label])=><NavLink key={to} to={to} end={to==='/'} className={({isActive})=>`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-extrabold transition ${isActive?'bg-blue-600 text-white shadow-md shadow-blue-100':'text-slate-600 hover:bg-blue-50 hover:text-blue-700'}`}><Icon size={18}/>{label}</NavLink>)}
        </nav>

        <div className="flex items-center gap-2">
          <button onClick={()=>nav('/search')} className="rounded-full border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50"><Search size={19}/></button>
          <button onClick={()=>nav('/notifications')} className="relative rounded-full border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50" aria-label={`${unreadCount} unread alerts`}>
            <Bell size={19}/>
            {unreadCount>0&&<span className="absolute -right-1.5 -top-1.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-black leading-none text-white ring-2 ring-white">{unreadCount>99?'99+':unreadCount}</span>}
          </button>
        </div>
      </div>
    </header>

    {popup&&<div className="fixed inset-x-3 top-[76px] z-[80] mx-auto max-w-md sm:right-5 sm:left-auto sm:mx-0 sm:w-[380px]">
      <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl shadow-slate-300/50">
        <button type="button" onClick={openPopup} className="block w-full p-4 pr-12 text-left">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.14em] text-blue-600"><Bell size={14}/>{popup.kind==='public'?'New Alert':'New Message'}</div>
          <p className="mt-1.5 font-black text-slate-900">{popup.title||'New notification'}</p>
          <p className="mt-1 line-clamp-3 text-sm leading-5 text-slate-600">{popup.message||popup.description||'Tap to view details.'}</p>
          <p className="mt-2 text-xs font-extrabold text-blue-600">Tap to open</p>
        </button>
        <button type="button" onClick={()=>setPopup(null)} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500" aria-label="Dismiss"><X size={16}/></button>
      </div>
    </div>}
  </>
}
