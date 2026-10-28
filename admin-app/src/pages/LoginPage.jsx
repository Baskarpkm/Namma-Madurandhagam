import { Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { API } from '../lib/api';
import BrandLogo from '../components/BrandLogo';

export default function LoginPage(){
  const nav=useNavigate();
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [show,setShow]=useState(false);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);

  if(localStorage.getItem('nm_admin_token'))return <Navigate to="/" replace/>;

  const submit=async(e)=>{
    e.preventDefault();
    setError('');setLoading(true);
    try{
      const res=await fetch(`${API}/auth/admin/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
      const data=await res.json();
      if(!res.ok)throw new Error(data.message||'Login failed');
      localStorage.setItem('nm_admin_token',data.token);
      nav('/',{replace:true});
    }catch(e){setError(e.message)}
    finally{setLoading(false)}
  };

  return <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#38bdf8,_transparent_22%),linear-gradient(135deg,#081a44,#0e4ea8_58%,#0891b2)] px-4 py-10">
    <section className="mx-auto grid max-w-5xl overflow-hidden rounded-[34px] bg-white shadow-2xl md:grid-cols-[1.05fr_.95fr]">
      <div className="relative hidden min-h-[620px] overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-9 text-white md:block">
        <div className="absolute -right-24 top-20 h-72 w-72 rounded-full bg-sky-400/15 blur-2xl"/>
        <BrandLogo className="h-20 w-20"/>
        <h1 className="mt-9 text-4xl font-black leading-tight">Manage our local<br/>digital community.</h1>
        <p className="mt-4 max-w-md text-blue-100">Control banners, categories, listings, users, chat, reports and local updates from one secure dashboard.</p>
        <div className="absolute inset-x-9 bottom-9 rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
          <p className="text-sm font-bold">Secure admin access</p>
          <p className="mt-1 text-xs leading-5 text-blue-100">Credentials remain in backend environment variables — never hardcoded in frontend source.</p>
        </div>
      </div>

      <div className="p-7 sm:p-10">
        <div className="flex items-center gap-3"><BrandLogo className="h-14 w-14"/><span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600"><ShieldCheck size={29}/></span></div>
        <p className="mt-6 text-xs font-black tracking-[.18em] text-blue-600">ADMIN PORTAL</p>
        <h2 className="mt-1 text-3xl font-black">Welcome back</h2>
        <p className="mt-2 text-sm text-slate-500">Login with your configured admin credentials.</p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <Field label="Username" icon={<UserRound size={19}/>}><input value={username} onChange={e=>setUsername(e.target.value)} className="w-full bg-transparent outline-none" placeholder="Enter username"/></Field>
          <Field label="Password" icon={<LockKeyhole size={19}/>}><input type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-transparent outline-none" placeholder="Enter password"/><button type="button" onClick={()=>setShow(!show)} className="text-slate-400">{show?<EyeOff size={19}/>:<Eye size={19}/>}</button></Field>
          {error&&<p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
          <button disabled={loading} className="w-full rounded-2xl bg-blue-600 py-3.5 font-extrabold text-white shadow-lg shadow-blue-200 disabled:opacity-60">{loading?'Signing in...':'Login to Dashboard'}</button>
        </form>
      </div>
    </section>
  </main>;
}

function Field({label,icon,children}){return <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">{label}</span><span className="flex items-center gap-3 rounded-2xl border bg-slate-50 px-4 py-3.5 text-slate-400 focus-within:border-blue-400">{icon}{children}</span></label>}
