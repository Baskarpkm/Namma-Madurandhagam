import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getUserToken } from '../lib/session';

export default function FollowButton({userId,initialStatus='none',compact=false,onChange}){
  const token=getUserToken();
  const [status,setStatus]=useState(initialStatus||'none');
  const [busy,setBusy]=useState(false);

  useEffect(()=>setStatus(initialStatus||'none'),[initialStatus,userId]);
  useEffect(()=>{
    const sync=(event)=>{if(String(event.detail?.userId)===String(userId))setStatus(event.detail?.status||'none')};
    window.addEventListener('nm-follow-change',sync);
    return()=>window.removeEventListener('nm-follow-change',sync);
  },[userId]);

  if(!userId||status==='self')return null;

  const act=async(event)=>{
    event?.preventDefault();event?.stopPropagation();
    if(busy)return;
    setBusy(true);
    const previous=status;
    try{
      const data=status==='accepted'||status==='pending'
        ?await api(`/social/profiles/${userId}/follow`,{token,method:'DELETE'})
        :await api(`/social/profiles/${userId}/follow`,{token,method:'POST'});
      const next=data.status||'none';
      setStatus(next);
      window.dispatchEvent(new CustomEvent('nm-follow-change',{detail:{userId,status:next}}));
      onChange?.(next,previous);
    }catch(e){console.error(e)}finally{setBusy(false)}
  };

  const label=status==='accepted'?'Following':status==='pending'?'Requested':'Follow';
  const strong=status==='none';
  return <button type="button" disabled={busy} onClick={act} className={`${compact?'px-3 py-1.5 text-xs':'px-4 py-2 text-sm'} shrink-0 rounded-xl font-extrabold transition disabled:opacity-50 ${strong?'bg-blue-600 text-white hover:bg-blue-700':'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{busy?'...':label}</button>;
}
