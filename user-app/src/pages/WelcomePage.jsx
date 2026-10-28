import { MapPin } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { prefetchHomeData } from '../lib/api';
import { clearWelcomeFlag, getUser, getUserToken } from '../lib/session';
import BrandLogo from '../components/BrandLogo';

export default function WelcomePage(){
  const nav=useNavigate();
  const user=getUser();
  const token=getUserToken();

  useEffect(()=>{
    clearWelcomeFlag();
    prefetchHomeData(token).catch(()=>{});
    const timer=setTimeout(()=>nav('/',{replace:true}),2400);
    return ()=>clearTimeout(timer);
  },[nav,token]);

  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-950 text-white">
    <img src="/madurandhagam-welcome.svg" alt="" className="absolute inset-0 h-full w-full object-cover"/>
    <div className="absolute inset-0 bg-gradient-to-b from-blue-950/35 via-blue-950/42 to-slate-950/80"/>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,.10),_transparent_55%)]"/>

    <section className="relative z-10 mx-auto w-full max-w-3xl px-6 text-center">
      <div className="mx-auto w-fit rounded-[30px] border border-white/30 bg-white/15 p-2 shadow-2xl backdrop-blur-md animate-[pulse_2s_ease-in-out_infinite]">
        <BrandLogo className="h-24 w-24" rounded="rounded-[24px]"/>
      </div>
      <p className="mt-6 text-sm font-black uppercase tracking-[.24em] text-sky-100">Vanakkam {user?.name||'Friend'}</p>
      <h1 className="mx-auto mt-3 max-w-2xl text-4xl font-black leading-tight drop-shadow-lg sm:text-6xl">Welcome to<br/><span className="text-sky-200">Namma Madurandhagam</span></h1>
      <p className="mt-4 text-xl font-extrabold text-white/95">நம்ம மதுராந்தகம்</p>
      <div className="mt-5 flex items-center justify-center gap-2 text-sm font-bold text-blue-50"><MapPin size={18}/> {user?.village||'Madurandhagam'} • Namma Ooru • Namma Makkal</div>
      <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-blue-50/90">Local updates, businesses, jobs, workers, events and our community — all in one place.</p>

      <div className="mx-auto mt-9 h-1.5 w-56 overflow-hidden rounded-full bg-white/20">
        <div className="h-full w-1/2 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,.8)] animate-[nmWelcome_1.1s_ease-in-out_infinite]"/>
      </div>
      <p className="mt-3 text-xs font-bold tracking-wide text-blue-100/85">Getting your Namma feed ready…</p>
    </section>

    <style>{`
      @keyframes nmWelcome{0%{transform:translateX(-110%)}100%{transform:translateX(220%)}}
    `}</style>
  </main>;
}
