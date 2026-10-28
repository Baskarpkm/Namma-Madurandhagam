import { Bell, Home, MapPin, MessageCircle, Plus, Search, UserRound, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { getUser, getUserToken } from '../lib/session';
import { getReadPublicAlertIds, markPublicAlertRead } from '../lib/alertState';
import BrandLogo from './BrandLogo';

const desktopLinks=[['/',Home,'Home'],['/post',Plus,'Post'],['/chat',MessageCircle,'Chat'],['/profile',UserRound,'Profile']];
const when=(date)=>date?new Date(date).getTime():0;

export default function AppHeader(){
  const user=getUser(),token=getUserToken(),nav=useNavigate();
  const [unreadCount,setUnreadCount]=useState(0),[popup,setPopup]=useState(null);
  const lastPopupId=useRef('');

  const navigateTo=useCallback((url)=>{
    if(!url)return nav('/notifications');
    if(/^https?:\/\//i.test(url)){window.location.assign(url);return}
    nav(url);
  },[nav]);

  const loadAlerts=useCallback(async()=>{
    try{
      const [personal,publicItems]=await Promise.all([api('/notifications',{token,fresh:true}),api('/content?type=incident',{token,fresh:true})]);
      const readPublic=getReadPublicAlertIds(user?.id);
      const personalUnread=(personal||[]).filter(x=>!x.readAt).map(x=>({...x,kind:'personal',popupId:`notification:${x._id}`,sortAt:when(x.createdAt)}));
      const publicUnread=(publicItems||[]).filter(x=>!readPublic.has(String(x._id))).map(x=>({...x,kind:'public',message:x.description||'',popupId:`alert:${x._id}`,sortAt:when(x.publishedAt||x.createdAt)}));
      const unread=[...personalUnread,...publicUnread].sort((a,b)=>b.sortAt-a.sortAt);
      setUnreadCount(unread.length);
      const newest=unread[0];
      if(newest&&newest.popupId!==lastPopupId.current){
        lastPopupId.current=newest.popupId;
        setPopup(newest);
      }
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
    if(popup.kind==='personal'&&!popup.readAt)await api(`/notifications/${popup._id}/read`,{token,method:'PATCH'}).catch(()=>{});
    else if(popup.kind==='public')markPublicAlertRead(user?.id,popup._id);
    const target=popup.actionUrl||popup.linkUrl||(popup.contentId?`/view/${popup.contentId}`:popup.kind==='public'?`/view/${popup._id}`:'/notifications');
    setPopup(null);
    loadAlerts();
    navigateTo(target);
  };

  const publicAlert=popup?.kind==='public';

  return <>
    <header className="sticky top-0 z-40 border-b border-blue-100/70 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <button onClick={()=>nav('/')} className="shrink-0 rounded-2xl ring-offset-2 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Namma Madurandhagam Home">
          <BrandLogo className="h-11 w-11"/>
        </button>
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

    {popup&&<div className="fixed inset-x-3 top-[76px] z-[80] mx-auto max-w-md sm:left-auto sm:right-5 sm:mx-0 sm:w-[380px]">
      <div className={`relative overflow-hidden rounded-2xl border-2 shadow-2xl ${publicAlert?'border-amber-300 bg-amber-50 shadow-amber-200/60':'border-violet-300 bg-violet-50 shadow-violet-200/60'}`}>
        <div className={`h-1.5 w-full ${publicAlert?'bg-amber-400':'bg-violet-400'}`}/>
        <button type="button" onClick={openPopup} className="block w-full p-4 pr-12 text-left">
          <div className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-[.14em] ${publicAlert?'text-amber-700':'text-violet-700'}`}>
            <span className={`grid h-7 w-7 place-items-center rounded-full ${publicAlert?'bg-amber-200':'bg-violet-200'}`}><Bell size={14}/></span>
            {publicAlert?'New Alert':'New Message'}
          </div>
          <p className="mt-2 font-black text-slate-950">{popup.title||'New notification'}</p>
          <p className="mt-1 line-clamp-3 text-sm leading-5 text-slate-700">{popup.message||popup.description||'Tap to view details.'}</p>
          <p className={`mt-2 text-xs font-extrabold ${publicAlert?'text-amber-700':'text-violet-700'}`}>Tap to open</p>
        </button>
        <button type="button" onClick={()=>setPopup(null)} className={`absolute right-3 top-4 grid h-8 w-8 place-items-center rounded-full ${publicAlert?'bg-amber-200 text-amber-800':'bg-violet-200 text-violet-800'}`} aria-label="Dismiss"><X size={16}/></button>
      </div>
    </div>}
  </>;
}
