import { ArrowRight, CheckCircle2, Phone, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { getUserToken, saveUserSession } from '../lib/session';
import BrandLogo from '../components/BrandLogo';

export default function LoginPage(){
  const nav=useNavigate();
  const [step,setStep]=useState('mobile');
  const [mobile,setMobile]=useState('');
  const [otp,setOtp]=useState('');
  const [devOtp,setDevOtp]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{if(getUserToken())nav('/',{replace:true})},[nav]);

  const sendOtp=async(e)=>{
    e.preventDefault();
    setError('');
    if(mobile.length!==10)return setError('Enter a valid 10 digit mobile number.');
    setLoading(true);
    try{
      const result=await api('/auth/user/check-mobile',{method:'POST',body:JSON.stringify({mobile})});
      if(!result.registered){
        setError('This mobile number is not registered. Please create an account first.');
        return;
      }
      const data=await api('/auth/user/request-otp',{method:'POST',body:JSON.stringify({mobile})});
      setDevOtp(data.devOtp||'');
      setStep('otp');
    }catch(err){setError(err.message)}
    finally{setLoading(false)}
  };

  const verify=async(e)=>{
    e.preventDefault();
    setError('');
    setLoading(true);
    try{
      const data=await api('/auth/user/verify-otp',{method:'POST',body:JSON.stringify({mobile,otp})});
      saveUserSession(data.token,data.user);
      nav('/',{replace:true});
    }catch(err){setError(err.message)}
    finally{setLoading(false)}
  };

  const changeNumber=()=>{setStep('mobile');setOtp('');setDevOtp('');setError('')};

  return <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe,_transparent_32%),linear-gradient(#f8fbff,#eef6ff)] px-4 py-8">
    <section className="mx-auto grid max-w-5xl overflow-hidden rounded-[34px] border border-blue-100 bg-white shadow-2xl shadow-blue-100/70 md:grid-cols-[1.05fr_.95fr]">
      <div className="relative hidden min-h-[650px] overflow-hidden bg-gradient-to-br from-blue-800 via-blue-600 to-cyan-400 p-9 text-white md:block">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10"/>
        <div className="absolute -bottom-16 -left-12 h-64 w-64 rounded-full bg-white/10"/>
        <div className="relative z-10">
          <BrandLogo className="h-20 w-20"/>
          <h1 className="mt-8 text-4xl font-black leading-tight">Namma<br/>Madurandhagam</h1>
          <p className="mt-4 max-w-sm text-blue-50">Our people, local shops, jobs, workers, vehicles, events and community updates — all in one place.</p>
        </div>
        <div className="absolute inset-x-9 bottom-10 rounded-3xl bg-white/12 p-5 backdrop-blur">
          <p className="font-bold">Login once. Stay signed in.</p>
          <p className="mt-1 text-sm text-blue-50">Just like WhatsApp, your session stays active until you choose Logout.</p>
        </div>
      </div>

      <div className="p-6 sm:p-9">
        <div className="md:hidden"><BrandLogo className="h-16 w-16"/></div>
        <p className="mt-5 text-xs font-extrabold tracking-[.18em] text-blue-600">WELCOME BACK</p>
        <h2 className="mt-1 text-3xl font-black text-slate-950">{step==='mobile'?'Login':'Verify OTP'}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">{step==='mobile'?'Enter your registered mobile number to continue.':`Enter the 6 digit OTP sent to +91 ${mobile}.`}</p>

        {step==='mobile'&&<form onSubmit={sendOtp} className="mt-8 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Mobile Number</span>
            <span className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-500 focus-within:border-blue-400 focus-within:bg-white">
              <Phone size={20}/>
              <span className="font-bold text-slate-500">+91</span>
              <input autoFocus className="min-w-0 flex-1 bg-transparent outline-none" inputMode="numeric" maxLength={10} placeholder="Enter 10 digit mobile number" value={mobile} onChange={e=>setMobile(e.target.value.replace(/\D/g,''))}/>
            </span>
          </label>
          {error&&<ErrorBox>{error}</ErrorBox>}
          <button disabled={loading||mobile.length!==10} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3.5 font-extrabold text-white shadow-lg shadow-blue-200 disabled:opacity-50">{loading?'Checking...':'Send OTP'} <ArrowRight size={18}/></button>
          <div className="border-t border-slate-100 pt-5 text-center">
            <p className="text-sm text-slate-500">New to Namma Madurandhagam?</p>
            <Link to="/register" className="mt-2 inline-flex font-extrabold text-blue-600 hover:text-blue-700">Create a new account</Link>
          </div>
        </form>}

        {step==='otp'&&<form onSubmit={verify} className="mt-8 space-y-5">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
            <p className="flex items-center gap-2 font-extrabold"><ShieldCheck size={18}/> OTP sent to +91 {mobile}</p>
            {devOtp&&<p className="mt-2">Test OTP: <b className="text-lg tracking-widest">{devOtp}</b></p>}
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">6 digit OTP</span>
            <input autoFocus inputMode="numeric" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-2xl font-black tracking-[.35em] outline-none focus:border-blue-400" placeholder="000000"/>
          </label>
          {error&&<ErrorBox>{error}</ErrorBox>}
          <button disabled={loading||otp.length!==6} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3.5 font-extrabold text-white shadow-lg shadow-blue-200 disabled:opacity-50">{loading?'Verifying...':'Verify & Login'} <CheckCircle2 size={18}/></button>
          <button type="button" onClick={changeNumber} className="w-full text-sm font-bold text-slate-500">Change mobile number</button>
        </form>}

        <p className="mt-8 text-center text-xs leading-5 text-slate-400">OTP is currently in test mode. Production OTP provider can be enabled before public launch.</p>
      </div>
    </section>
  </main>;
}

function ErrorBox({children}){return <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{children}</p>}
