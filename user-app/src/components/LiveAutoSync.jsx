import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { API, resetApiCache } from '../lib/api';

const skipExact=new Set(['/login','/register','/welcome']);
const skipPrefixes=['/post','/mock-payment/','/chat','/story/'];

export default function LiveAutoSync({onSync,intervalMs=4000}){
  const location=useLocation();
  const versionRef=useRef(null);

  useEffect(()=>{
    let cancelled=false;

    const isPaused=()=>{
      const path=location.pathname;
      if(skipExact.has(path)||skipPrefixes.some(prefix=>path.startsWith(prefix)))return true;
      if(document.visibilityState!=='visible')return true;
      const active=document.activeElement;
      if(active&&['INPUT','TEXTAREA','SELECT'].includes(active.tagName))return true;
      if(document.querySelector('[data-auto-sync-pause="true"]'))return true;
      return false;
    };

    const check=async(force=false)=>{
      try{
        const res=await fetch(`${API}/live/version`,{cache:'no-store'});
        if(!res.ok)return;
        const data=await res.json();
        const next=Number(data?.version||0);
        if(cancelled||!next)return;

        if(versionRef.current===null){
          versionRef.current=next;
          return;
        }
        if(next===versionRef.current&&!force)return;

        const changed=next!==versionRef.current;
        if(!changed)return;
        if(isPaused())return;
        versionRef.current=next;

        const x=window.scrollX,y=window.scrollY;
        resetApiCache();
        onSync?.();
        requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo(x,y)));
      }catch{}
    };

    check();
    const timer=setInterval(()=>check(),intervalMs);
    const onFocus=()=>check(true);
    const onVisible=()=>{if(document.visibilityState==='visible')check(true)};
    window.addEventListener('focus',onFocus);
    document.addEventListener('visibilitychange',onVisible);

    return()=>{
      cancelled=true;
      clearInterval(timer);
      window.removeEventListener('focus',onFocus);
      document.removeEventListener('visibilitychange',onVisible);
    };
  },[location.pathname,onSync,intervalMs]);

  return null;
}
