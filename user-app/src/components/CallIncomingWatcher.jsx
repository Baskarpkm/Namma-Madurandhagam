import { Phone, PhoneOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { getUserToken } from '../lib/session';
import UserAvatar from './UserAvatar';

export default function CallIncomingWatcher(){
  const token=getUserToken(),nav=useNavigate(),location=useLocation();
  const [call,setCall]=useState(null);

  useEffect(()=>{
    if(!token)return;
    let dead=false;
    const tick=async()=>{
      if(location.pathname.startsWith('/call/')){setCall(null);return}
      try{
        const r=await api('/calls/incoming',{token});
        if(!dead)setCall(r.call||null);
      }catch{}
    };
    tick();
    const id=setInterval(tick,3000);
    return()=>{dead=true;clearInterval(id)};
  },[token,location.pathname]);

  if(!call)return null;
  const caller=call.caller||{};
  const decline=async()=>{try{await api(`/calls/${call.id}/decline`,{token,method:'POST'})}catch{}setCall(null)};
  return <div className="fixed inset-x-3 top-3 z-[200] mx-auto max-w-md rounded-[26px] border bg-white p-4 shadow-2xl">
    <div className="flex items-center gap-3">
      <UserAvatar user={caller} sizeClass="h-12 w-12" iconSize={22}/>
      <div className="min-w-0 flex-1"><p className="text-xs font-black uppercase tracking-[.12em] text-blue-600">Incoming audio call</p><p className="truncate text-lg font-black text-slate-950">{caller.name||'Namma Madurandhagam user'}</p></div>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-2">
      <button onClick={decline} className="flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 font-black text-white"><PhoneOff size={18}/>Decline</button>
      <button onClick={()=>{setCall(null);nav(`/call/${call.id}`,{state:{autoAccept:true}})}} className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 font-black text-white"><Phone size={18}/>Accept</button>
    </div>
  </div>;
}
