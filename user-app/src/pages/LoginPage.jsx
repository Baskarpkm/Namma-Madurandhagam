import { ArrowLeft, ArrowRight, Camera, CheckCircle2, MapPin, Phone, ShieldCheck, UserRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { getUserToken, saveUserSession } from '../lib/session';
import UserAvatar from '../components/UserAvatar';

const villages=['Madurandhagam Town','Karunguzhi','Padalam','Acharapakkam','Other / Not Listed'];

export default function LoginPage(){
  const nav=useNavigate();
  const [step,setStep]=useState('mobile');
  const [isExisting,setIsExisting]=useState(false);
  const [form,setForm]=useState({name:'',mobile:'',village:'',gender:''});
  const [avatarFile,setAvatarFile]=useState(null);
  const [preview,setPreview]=useState('');
  const [otp,setOtp]=useState('');
  const [devOtp,setDevOtp]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{if(getUserToken())nav('/',{replace:true})},[nav]);
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);

  const choosePhoto=(file)=>{if(!file)return;if(preview)URL.revokeObjectURL(preview);setAvatarFile(file);setPreview(URL.createObjectURL(file));};
  const removePhoto=()=>{if(preview)URL.revokeObjectURL(preview);setAvatarFile(null);setPreview('')};
  const requestOtp=async()=>{const data=await api('/auth/user/request-otp',{method:'POST',body:JSON.stringify({mobile:form.mobile})});setDevOtp(data.devOtp||'');setStep('otp')};

  const checkMobile=async(e)=>{
    e.preventDefault();setError('');
    if(form.mobile.length!==10)return setError('Enter a valid 10 digit mobile number.');
    setLoading(true);
    try{
      const result=await api('/auth/user/check-mobile',{method:'POST',body:JSON.stringify({mobile:form.mobile})});
      if(result.registered){setIsExisting(true);await requestOtp()}
      else{setIsExisting(false);setStep('register')}
    }catch(err){setError(err.message)}finally{setLoading(false)}
  };

  const registerAndRequestOtp=async(e)=>{
    e.preventDefault();setError('');
    if(!form.name.trim()||!form.village||!form.gender)return setError('Name, Area / Village and gender are required for first registration.');
    setLoading(true);try{await requestOtp()}catch(err){setError(err.message)}finally{setLoading(false)}
  };

  const verify=async(e)=>{
    e.preventDefault();setError('');setLoading(true);
    try{
      const body=isExisting?{mobile:form.mobile,otp}:{...form,otp};
      const data=await api('/auth/user/verify-otp',{method:'POST',body:JSON.stringify(body)});
      let nextUser=data.user;
      saveUserSession(data.token,nextUser);
      if(!isExisting&&avatarFile){
        try{
          const fd=new FormData();fd.append('file',avatarFile);
          const uploaded=await api('/upload/user/avatar',{token:data.token,method:'POST',body:fd});
          const updated=await api('/auth/user/profile',{token:data.token,method:'PATCH',body:JSON.stringify({profilePhotoUrl:uploaded.url,profilePhotoPublicId:uploaded.publicId})});
          nextUser=updated.user;saveUserSession(data.token,nextUser);
        }catch(photoErr){console.warn('Profile photo upload failed',photoErr)}
      }
      nav('/',{replace:true});
    }catch(err){setError(err.message)}finally{setLoading(false)}
  };

  const resetMobile=()=>{setStep('mobile');setIsExisting(false);setOtp('');setDevOtp('');setError('')};
  const title=step==='mobile'?'Login / Register':step==='register'?'Create your profile':'Verify OTP';
  const description=step==='mobile'?'Enter your mobile number. Existing users can login with mobile + OTP only.':step==='register'?'This mobile number is new. Add your details once to create your account.':`Enter the 6 digit OTP sent to +91 ${form.mobile}.`;

  return <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe,_transparent_32%),linear-gradient(#f8fbff,#eef6ff)] px-4 py-8">
    <section className="mx-auto grid max-w-5xl overflow-hidden rounded-[34px] border border-blue-100 bg-white shadow-2xl shadow-blue-100/70 md:grid-cols-[1.05fr_.95fr]">
      <div className="relative hidden min-h-[650px] overflow-hidden bg-gradient-to-br from-blue-800 via-blue-600 to-cyan-400 p-9 text-white md:block">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10"/><div className="absolute -bottom-16 -left-12 h-64 w-64 rounded-full bg-white/10"/>
        <div className="relative z-10"><span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/15 text-2xl font-black ring-1 ring-white/25">NM</span><h1 className="mt-8 text-4xl font-black leading-tight">Namma<br/>Madurandhagam</h1><p className="mt-4 max-w-sm text-blue-50">Our people, local shops, jobs, workers, vehicles, events and community updates — all in one place.</p></div>
        <div className="absolute inset-x-9 bottom-10 rounded-3xl bg-white/12 p-5 backdrop-blur"><p className="font-bold">Register once. Login faster next time.</p><p className="mt-1 text-sm text-blue-50">Existing users only need their mobile number and OTP. New users complete profile setup once.</p></div>
      </div>
      <div className="p-6 sm:p-9">
        <div className="md:hidden"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-600 font-black text-white">NM</span></div>
        <p className="mt-5 text-xs font-extrabold tracking-[.18em] text-blue-600">WELCOME</p><h2 className="mt-1 text-3xl font-black text-slate-950">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>

        {step==='mobile'&&<form onSubmit={checkMobile} className="mt-7 space-y-5">
          <Field label="Mobile Number" icon={<Phone size={20}/>}><input autoFocus className="w-full bg-transparent outline-none" inputMode="numeric" maxLength={10} placeholder="Enter 10 digit mobile number" value={form.mobile} onChange={e=>setForm({...form,mobile:e.target.value.replace(/\D/g,'')})}/></Field>
          {error&&<ErrorBox>{error}</ErrorBox>}
          <button disabled={loading||form.mobile.length!==10} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3.5 font-extrabold text-white shadow-lg shadow-blue-200 disabled:opacity-50">{loading?'Checking...':'Continue'} <ArrowRight size={18}/></button>
          <p className="text-center text-xs leading-5 text-slate-400">Already registered? No need to enter name or area again.</p>
        </form>}

        {step==='register'&&<form onSubmit={registerAndRequestOtp} className="mt-7 space-y-5">
          <button type="button" onClick={resetMobile} className="inline-flex items-center gap-1 text-sm font-extrabold text-blue-600"><ArrowLeft size={16}/> Change mobile number</button>
          <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">New account for +91 {form.mobile}</div>
          <div><span className="mb-2 block text-sm font-bold text-slate-700">Profile Photo <span className="font-medium text-slate-400">(optional)</span></span><div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">{preview?<span className="h-20 w-20 overflow-hidden rounded-full"><img src={preview} className="h-full w-full object-cover"/></span>:<UserAvatar user={{gender:form.gender||'other'}} sizeClass="h-20 w-20" iconSize={34}/>}<div className="min-w-0 flex-1"><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-extrabold text-white"><Camera size={17}/> Choose Photo<input type="file" accept="image/*" className="hidden" onChange={e=>{choosePhoto(e.target.files?.[0]);e.target.value=''}}/></label>{preview&&<button type="button" onClick={removePhoto} className="ml-2 inline-flex items-center gap-1 rounded-xl border bg-white px-3 py-2 text-sm font-bold text-red-600"><X size={15}/> Remove</button>}<p className="mt-2 text-xs text-slate-400">No photo? Default male/female avatar will be shown.</p></div></div></div>
          <Field label="Your Name" icon={<UserRound size={20}/>}><input className="w-full bg-transparent outline-none" placeholder="Enter your name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field>
          <Field label="Area / Village" icon={<MapPin size={20}/>}><select className="w-full bg-transparent outline-none" value={form.village} onChange={e=>setForm({...form,village:e.target.value})}><option value="">Select area / village</option>{villages.map(v=><option key={v}>{v}</option>)}</select></Field>
          <Field label="Gender" icon={<UserRound size={20}/>}><select className="w-full bg-transparent outline-none" value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}><option value="">Select gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other / Prefer not to say</option></select></Field>
          {error&&<ErrorBox>{error}</ErrorBox>}
          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3.5 font-extrabold text-white shadow-lg shadow-blue-200 disabled:opacity-60">{loading?'Sending...':'Send OTP & Register'} <ArrowRight size={18}/></button>
        </form>}

        {step==='otp'&&<form onSubmit={verify} className="mt-7 space-y-5">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800"><p className="flex items-center gap-2 font-extrabold"><ShieldCheck size={18}/> OTP sent to +91 {form.mobile}</p><p className="mt-1 text-xs font-semibold text-blue-600">{isExisting?'Welcome back — your saved profile will be used.':'Complete OTP verification to create your account.'}</p>{devOtp&&<p className="mt-2">Local development OTP: <b className="text-lg tracking-widest">{devOtp}</b></p>}</div>
          <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">6 digit OTP</span><input autoFocus inputMode="numeric" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-2xl font-black tracking-[.35em] outline-none focus:border-blue-400" placeholder="000000"/></label>
          {error&&<ErrorBox>{error}</ErrorBox>}
          <button disabled={loading||otp.length!==6} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3.5 font-extrabold text-white shadow-lg shadow-blue-200 disabled:opacity-50">{loading?'Verifying...':'Verify & Continue'} <CheckCircle2 size={18}/></button>
          <button type="button" onClick={resetMobile} className="w-full text-sm font-bold text-slate-500">Change mobile number</button>
        </form>}
        <p className="mt-7 text-center text-xs leading-5 text-slate-400">Development currently uses a local test OTP. Firebase Phone Authentication will replace it before production launch.</p>
      </div>
    </section>
  </main>
}
function Field({label,icon,children}){return <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">{label}</span><span className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-500 focus-within:border-blue-400 focus-within:bg-white">{icon}{children}</span></label>}
function ErrorBox({children}){return <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{children}</p>}
