import { Ban, Clock3, LogIn, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { clearUserSession, getUserToken } from '../lib/session';
import BrandLogo from './BrandLogo';

export default function AccountStatusGate(){
  const nav=useNavigate();
  const [blocked,setBlocked]=useState(null);

  useEffect(()=>{
    let live=true;
    const check=async()=>{
      const token=getUserToken();
      if(!token){if(live)setBlocked(null);return}
      try{
        const data=await api('/auth/user/me',{token,fresh:true});
        if(!live)return;
        const user=data?.user;
        if(user&&user.status&&user.status!=='active')setBlocked(user);
        else setBlocked(null);
      }catch(e){
        // Normal API/network errors must not accidentally lock the screen.
        if(e?.status===401&&live)setBlocked(null);
      }
    };
    check();
    const id=setInterval(check,10000);
    const focus=()=>check();
    window.addEventListener('focus',focus);
    return()=>{live=false;clearInterval(id);window.removeEventListener('focus',focus)};
  },[]);

  if(!blocked)return null;
  const banned=blocked.status==='banned';
  const until=blocked.suspendedUntil?new Date(blocked.suspendedUntil):null;
  const days=until?Math.max(1,Math.ceil((until-Date.now())/(24*60*60*1000))):null;

  const anotherAccount=()=>{
    clearUserSession();
    setBlocked(null);
    nav('/login',{replace:true});
  };

  return <div className="fixed inset-0 z-[250] grid place-items-center overflow-y-auto bg-slate-950 px-4 py-8">
    <section className="w-full max-w-md rounded-[32px] bg-white p-6 text-center shadow-2xl sm:p-8">
      <BrandLogo className="mx-auto h-20 w-20"/>
      <span className={`mx-auto mt-6 grid h-16 w-16 place-items-center rounded-full ${banned?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700'}`}>
        {banned?<Ban size={32}/>:<ShieldAlert size={32}/>} 
      </span>
      <h1 className="mt-5 text-2xl font-black text-slate-950">{banned?'Your account is banned':'Your account is suspended'}</h1>
      {blocked.statusReason&&<div className="mt-4 rounded-2xl bg-slate-50 p-4 text-left"><p className="text-xs font-black uppercase tracking-wider text-slate-400">Reason</p><p className="mt-1 whitespace-pre-wrap font-semibold leading-6 text-slate-700">{blocked.statusReason}</p></div>}
      {!banned&&<div className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-amber-50 p-3 font-extrabold text-amber-800"><Clock3 size={18}/><span>{days?`${days} day${days===1?'':'s'} remaining`:'Suspended until Admin reactivates your account'}</span></div>}
      <button onClick={anotherAccount} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3.5 font-extrabold text-white"><LogIn size={19}/> Sign in another account</button>
    </section>
  </div>;
}
