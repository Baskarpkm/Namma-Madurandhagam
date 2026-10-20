import { ArrowLeft, ArrowRight, Camera, CheckCircle2, MapPin, Phone, ShieldCheck, UserRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { getUserToken, saveUserSession } from '../lib/session';
import UserAvatar from '../components/UserAvatar';

export default function RegisterPage(){
  const nav=useNavigate();
  const [step,setStep]=useState('form');
  const [form,setForm]=useState({name:'',mobile:'',village:'',address:'',gender:''});
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

  const sendOtp=async(e)=>{
    e.preventDefault();
    setError('');
    if(!form.name.trim())return setError('Enter your name.');
    if(form.mobile.length!==10)return setError('Enter a valid 10 digit mobile number.');
    if(!form.village.trim())return setError('Enter your Area / Village.');
    if(!form.gender)return setError('Choose your gender.');
    setLoading(true);
    try{
      const result=await api('/auth/user/check-mobile',{method:'POST',body:JSON.stringify({mobile:form.mobile})});
      if(result.registered){setError('This mobile number is already registered. Please login instead.');return;}
      const data=await api('/auth/user/request-otp',{method:'POST',body:JSON.stringify({mobile:form.mobile})});
      setDevOtp(data.devOtp||'');
      setStep('otp');
    }catch(err){setError(err.message)}finally{setLoading(false)}
  };

  const verify=async(e)=>{
    e.preventDefault();
    setError('');
    setLoading(true);
    try{
      const data=await api('/auth/user/verify-otp',{method:'POST',body:JSON.stringify({...form,village:form.village.trim(),otp})});
      let nextUser=data.user;
      saveUserSession(data.token,nextUser);
      if(avatarFile){
        try{
          const fd=new FormData();fd.append('file',avatarFile);
          const uploaded=await api('/upload/user/avatar',{token:data.token,method:'POST',body:fd});
          const updated=await api('/auth/user/profile',{token:data.token,method:'PATCH',body:JSON.stringify({profilePhotoUrl:uploaded.url,profilePhotoPublicId:uploaded.publicId})});
          nextUser=updated.user;
          saveUserSession(data.token,nextUser);
        }catch(photoErr){console.warn('Profile photo upload failed',photoErr)}
      }
      nav('/',{replace:true});
    }catch(err){setError(err.message)}finally{setLoading(false)}
  };

  return <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe,_transparent_32%),linear-gradient(#f8fbff,#eef6ff)] px-4 py-8">
    <section className="mx-auto max-w-2xl overflow-hidden rounded-[34px] border border-blue-100 bg-white p-6 shadow-2xl shadow-blue-100/70 sm:p-9">
      <div className="flex items-center justify-between gap-4">
        <div><span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-600 font-black text-white">NM</span></div>
        <Link to="/login" className="inline-flex items-center gap-1 text-sm font-extrabold text-blue-600"><ArrowLeft size={16}/> Back to Login</Link>
      </div>
      <p className="mt-6 text-xs font-extrabold tracking-[.18em] text-blue-600">NEW USER</p>
      <h1 className="mt-1 text-3xl font-black text-slate-950">{step==='form'?'Create your profile':'Verify OTP'}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">{step==='form'?'Register once. After that, you can login using only your mobile number and OTP.':`Enter the OTP sent to +91 ${form.mobile}.`}</p>

      {step==='form'&&<form onSubmit={sendOtp} className="mt-7 space-y-5">
        <div>
          <span className="mb-2 block text-sm font-bold text-slate-700">Profile Photo <span className="font-medium text-slate-400">(optional)</span></span>
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            {preview?<span className="h-20 w-20 overflow-hidden rounded-full"><img src={preview} alt="Profile preview" className="h-full w-full object-cover"/></span>:<UserAvatar user={{gender:form.gender||'other'}} sizeClass="h-20 w-20" iconSize={34}/>} 
            <div className="min-w-0 flex-1">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-extrabold text-white"><Camera size={17}/> Choose Photo<input type="file" accept="image/*" className="hidden" onChange={e=>{choosePhoto(e.target.files?.[0]);e.target.value=''}}/></label>
              {preview&&<button type="button" onClick={removePhoto} className="ml-2 inline-flex items-center gap-1 rounded-xl border bg-white px-3 py-2 text-sm font-bold text-red-600"><X size={15}/> Remove</button>}
              <p className="mt-2 text-xs text-slate-400">No photo? Default avatar will be shown.</p>
            </div>
          </div>
        </div>

        <Field label="Your Name" icon={<UserRound size={20}/>}><input className="w-full bg-transparent outline-none" placeholder="Enter your name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field>
        <Field label="Mobile Number" icon={<Phone size={20}/>}><div className="flex w-full items-center gap-2"><span className="font-bold text-slate-500">+91</span><input className="min-w-0 flex-1 bg-transparent outline-none" inputMode="numeric" maxLength={10} placeholder="Enter 10 digit mobile number" value={form.mobile} onChange={e=>setForm({...form,mobile:e.target.value.replace(/\D/g,'')})}/></div></Field>
        <Field label="Area / Village *" icon={<MapPin size={20}/>}><input required className="w-full bg-transparent outline-none" placeholder="Type your area / village" value={form.village} onChange={e=>setForm({...form,village:e.target.value})}/></Field>
        <Field label="Address" icon={<MapPin size={20}/>}><input className="w-full bg-transparent outline-none" placeholder="House / street / locality (optional)" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></Field>
        <Field label="Gender" icon={<UserRound size={20}/>}><select className="w-full bg-transparent outline-none" value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}><option value="">Select gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other / Prefer not to say</option></select></Field>
        {error&&<ErrorBox>{error}</ErrorBox>}
        <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3.5 font-extrabold text-white shadow-lg shadow-blue-200 disabled:opacity-60">{loading?'Sending...':'Send OTP & Register'} <ArrowRight size={18}/></button>
        <p className="text-center text-sm text-slate-500">Already registered? <Link to="/login" className="font-extrabold text-blue-600">Login</Link></p>
      </form>}

      {step==='otp'&&<form onSubmit={verify} className="mt-7 space-y-5">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800"><p className="flex items-center gap-2 font-extrabold"><ShieldCheck size={18}/> OTP sent to +91 {form.mobile}</p>{devOtp&&<p className="mt-2">Test OTP: <b className="text-lg tracking-widest">{devOtp}</b></p>}</div>
        <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">6 digit OTP</span><input autoFocus inputMode="numeric" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-2xl font-black tracking-[.35em] outline-none focus:border-blue-400" placeholder="000000"/></label>
        {error&&<ErrorBox>{error}</ErrorBox>}
        <button disabled={loading||otp.length!==6} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3.5 font-extrabold text-white shadow-lg shadow-blue-200 disabled:opacity-50">{loading?'Creating account...':'Verify & Create Account'} <CheckCircle2 size={18}/></button>
        <button type="button" onClick={()=>{setStep('form');setOtp('');setDevOtp('');setError('')}} className="w-full text-sm font-bold text-slate-500">Edit registration details</button>
      </form>}
    </section>
  </main>
}

function Field({label,icon,children}){return <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">{label}</span><span className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-500 focus-within:border-blue-400 focus-within:bg-white">{icon}{children}</span></label>}
function ErrorBox({children}){return <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{children}</p>}
