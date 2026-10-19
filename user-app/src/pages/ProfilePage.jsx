import { Camera, FileCheck2, LogOut, MapPin, Phone, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { clearUserSession, getUser, getUserToken, updateStoredUser } from '../lib/session';
import UserAvatar from '../components/UserAvatar';

export default function ProfilePage(){
  const token=getUserToken(),nav=useNavigate();
  const [user,setUser]=useState(getUser());
  const [form,setForm]=useState({name:user?.name||'',village:user?.village||'',address:user?.address||'',gender:user?.gender||'other'});
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
  const sync=(next)=>{setUser(next);setForm({name:next?.name||'',village:next?.village||'',address:next?.address||'',gender:next?.gender||'other'});updateStoredUser(next)};
  useEffect(()=>{api('/auth/user/me',{token}).then(r=>sync(r.user)).catch(()=>{})},[]);
  const logout=()=>{clearUserSession();nav('/login',{replace:true})};
  const save=async(e)=>{e.preventDefault();setBusy(true);setError('');setNotice('');try{const r=await api('/auth/user/profile',{token,method:'PATCH',body:JSON.stringify(form)});sync(r.user);setNotice('Profile updated successfully.')}catch(e){setError(e.message)}finally{setBusy(false)}};
  const uploadPhoto=async(file)=>{if(!file)return;setBusy(true);setError('');setNotice('');try{const fd=new FormData();fd.append('file',file);const uploaded=await api('/upload/user/avatar',{token,method:'POST',body:fd});const r=await api('/auth/user/profile',{token,method:'PATCH',body:JSON.stringify({profilePhotoUrl:uploaded.url,profilePhotoPublicId:uploaded.publicId})});sync(r.user);setNotice('Profile photo updated.')}catch(e){setError(e.message)}finally{setBusy(false)}};
  const removePhoto=async()=>{setBusy(true);setError('');try{const r=await api('/auth/user/profile',{token,method:'PATCH',body:JSON.stringify({profilePhotoUrl:'',profilePhotoPublicId:''})});sync(r.user);setNotice('Profile photo removed.')}catch(e){setError(e.message)}finally{setBusy(false)}};

  return <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
    <section className="overflow-hidden rounded-[30px] border bg-white shadow-sm">
      <div className="bg-gradient-to-r from-blue-700 to-sky-500 p-6 text-white">
        <div className="flex flex-wrap items-center gap-4"><UserAvatar user={user} sizeClass="h-24 w-24" iconSize={40} className="ring-4 ring-white/25"/><div><h1 className="text-2xl font-black">{user?.name}</h1><p className="mt-1 text-sm text-blue-100">Namma Madurandhagam Member</p><div className="mt-3 flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs font-extrabold ring-1 ring-white/20"><Camera size={15}/> Change Photo<input type="file" accept="image/*" className="hidden" onChange={e=>{uploadPhoto(e.target.files?.[0]);e.target.value=''}}/></label>{user?.profilePhotoUrl&&<button type="button" disabled={busy} onClick={removePhoto} className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs font-extrabold ring-1 ring-white/20"><Trash2 size={14}/> Remove</button>}</div></div></div>
      </div>
      <form onSubmit={save} className="space-y-4 p-5">
        {error&&<p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}{notice&&<p className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{notice}</p>}
        <label className="block"><span className="mb-1.5 block text-sm font-bold">Name</span><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full rounded-xl border bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-400"/></label>
        <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-bold">Area / Village</span><input value={form.village} onChange={e=>setForm({...form,village:e.target.value})} className="w-full rounded-xl border bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-400"/></label><label><span className="mb-1.5 block text-sm font-bold">Gender</span><select value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})} className="w-full rounded-xl border bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-400"><option value="male">Male</option><option value="female">Female</option><option value="other">Other / Prefer not to say</option></select></label></div>
        <label className="block"><span className="mb-1.5 block text-sm font-bold">Full Address</span><textarea rows="3" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Door no, street, area, village..." className="w-full rounded-xl border bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-400"/></label>
        <div className="grid gap-2 rounded-2xl bg-slate-50 p-3 sm:grid-cols-2"><Info icon={<Phone/>} label="Mobile" value={user?.mobile?`+91 ${user.mobile}`:'-'}/><Info icon={<ShieldCheck/>} label="Account" value="Mobile verified"/></div>
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-extrabold text-white disabled:opacity-50"><Save size={18}/>{busy?'Saving...':'Save Profile'}</button>
        <Link to="/my-submissions" className="flex items-center gap-3 rounded-2xl border p-3 hover:bg-slate-50"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><FileCheck2/></span><div><p className="text-xs font-semibold text-slate-400">Posts, Stories & Listings</p><p className="font-bold text-slate-800">My Posts / Submissions</p></div></Link>
      </form>
    </section>
    <button onClick={logout} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 font-extrabold text-red-700"><LogOut size={19}/> Logout</button>
  </main>
}
function Info({icon,label,value}){return <div className="flex items-center gap-3 rounded-xl p-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-blue-600 shadow-sm">{icon}</span><div><p className="text-xs font-semibold text-slate-400">{label}</p><p className="font-bold text-slate-800">{value}</p></div></div>}
