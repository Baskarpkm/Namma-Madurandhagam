import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { API } from '../lib/api';
import { getUserToken } from '../lib/session';

const HEARTBEAT_MS=45*1000;

export default function PresenceHeartbeat(){
  const location=useLocation();
  const token=getUserToken();

  useEffect(()=>{
    if(!token)return undefined;
    let stopped=false;

    const beat=()=>{
      if(stopped||document.visibilityState!=='visible')return;
      fetch(`${API}/presence/heartbeat`,{
        method:'POST',
        cache:'no-store',
        headers:{Authorization:`Bearer ${token}`}
      }).catch(()=>{});
    };

    beat();
    const timer=setInterval(beat,HEARTBEAT_MS);
    const onFocus=()=>beat();
    const onVisible=()=>{if(document.visibilityState==='visible')beat()};
    window.addEventListener('focus',onFocus);
    document.addEventListener('visibilitychange',onVisible);

    return()=>{
      stopped=true;
      clearInterval(timer);
      window.removeEventListener('focus',onFocus);
      document.removeEventListener('visibilitychange',onVisible);
    };
  },[token,location.pathname]);

  return null;
}
