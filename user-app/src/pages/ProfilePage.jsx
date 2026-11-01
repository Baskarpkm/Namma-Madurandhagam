import { Camera, ChevronRight, FileCheck2, FileText, Headphones, Images, IndianRupee, Lock, LogOut, MessageCircle, Pencil, Phone, RefreshCcw, Save, ShieldCheck, Trash2, Truck, Unlock, UserPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { clearUserSession, getUser, getUserToken, updateStoredUser } from '../lib/session';
import UserAvatar from '../components/UserAvatar';
import ProfilePhotoCropper from '../components/ProfilePhotoCropper';

export default function ProfilePage(){
  const token=getUserToken(),nav=useNavigate();
  const [user,setUser]=useState(getUser()),[editing,setEditing]=useState(false);
  const [form,setForm]=useState({name:user?.name||'',village:user?.village||'',address:user?.address||'',gender:user?.gender||'other'});
  const [summary,setSummary]=useState({counts:{posts:0,followers:0,following:0},requestCount:0});
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState(''),[cropFile,setCropFile]=useState(null);

  const sync=next=>{setUser(next);setForm({name:next?.name||'',village:next?.village||'',address:next?.address||'',gender:next?.gender||'other'});updateStoredUser(next)};
  const loadSummary=()=>api('/social/me/summary',{token}).then(setSummary).catch(()=>{});
  useEffect(()=>{api('/auth/user/me',{token}).then(r=>sync(r.user)).catch(()=>{});loadSummary()},[]);
  const logout=()=>{clearUserSession();nav('/login',{replace:true})};

  const save=async e=>{e.preventDefault();setBusy(true);setError('');setNotice('');try{const r=await api('/auth/user/profile',{token,method:'PATCH',body:JSON.stringify(form)});sync(r.user);setEditing(false);setNotice('Profile updated successfully.')}catch(e){setError(e.message)}finally{setBusy(false)}};
  const setPrivacy=async next=>{setBusy(true);setError('');try{const r=await api('/social/privacy',{token,method:'PATCH',body:JSON.stringify({isPrivate:next})});sync({...user,isPrivate:r.user.isPrivate});await loadSummary();setNotice('Profile privacy updated successfully.')}catch(e){setError(e.message)}finally{setBusy(false)}};
  const setContactPreference=async(key,next)=>{setBusy(true);setError('');try{const r=await api('/auth/user/profile',{token,method:'PATCH',body:JSON.stringify({[key]:next})});sync(r.user);setNotice('Contact preference updated successfully.')}catch(e){setError(e.message)}finally{setBusy(false)}};
  const uploadPhoto=async blob=>{if(!blob)return;setBusy(true);try{const fd=new FormData();fd.append('file',blob,'profile.jpg');const uploaded=await api('/upload/user/avatar',{token,method:'POST',body:fd});const r=await api('/auth/user/profile',{token,method:'PATCH',body:JSON.stringify({profilePhotoUrl:uploaded.url,profilePhotoPublicId:uploaded.publicId})});sync(r.user);setNotice('Profile photo updated successfully.')}catch(e){setError(e.message)}finally{setBusy(false)}};
  const removePhoto=async()=>{setBusy(true);try{const r=await api('/auth/user/profile',{token,method:'PATCH',body:JSON.stringify({profilePhotoUrl:'',profilePhotoPublicId:''})});sync(r.user);setNotice('Profile photo removed.')}catch(e){setError(e.message)}finally{setBusy(false)}};

  const c=summary?.counts||{};
  return <>
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      <section className="overflow-hidden rounded-[30px] border bg-white shadow-sm">
        <div className="bg-gradient-to-r from-blue-700 to-sky-500 p-6 text-white">
          <div className="flex items-center gap-4">
            <UserAvatar user={user} sizeClass="h-24 w-24" iconSize={40} className="ring-4 ring-white/25"/>
            <div className="min-w-0 flex-1"><h1 className="truncate text-2xl font-black">{user?.name}</h1>{user?.username&&<p className="mt-0.5 truncate text-sm font-extrabold text-cyan-100">@{user.username}</p>}<p className="mt-1 text-sm text-blue-100">{user?.village||'Namma Madurandhagam Member'}</p></div>
            {!editing&&<button onClick={()=>{setEditing(true);setNotice('')}} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-black text-blue-700"><Pencil size={16}/>Edit</button>}
          </div>
          <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/15">
            <Link to={user?.id?`/profile/${user.id}`:'/profile'} className="p-3 text-center"><p className="text-xl font-black">{c.posts||0}</p><p className="text-[11px] font-bold text-blue-100">Posts</p></Link>
            <Link to={user?.id?`/profile/${user.id}/followers`:'/profile'} className="border-x border-white/15 p-3 text-center"><p className="text-xl font-black">{c.followers||0}</p><p className="text-[11px] font-bold text-blue-100">Followers</p></Link>
            <Link to={user?.id?`/profile/${user.id}/following`:'/profile'} className="p-3 text-center"><p className="text-xl font-black">{c.following||0}</p><p className="text-[11px] font-bold text-blue-100">Following</p></Link>
          </div>
          {!!summary?.requestCount&&<Link to="/follow-requests" className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black text-blue-700"><UserPlus size={14}/>{summary.requestCount} follow request{summary.requestCount===1?'':'s'}</Link>}
        </div>

        <div className="space-y-4 p-5">
          {error&&<p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
          {notice&&<div className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{notice}</div>}

          {!editing?<>
            <ViewRow label="Name" value={user?.name||'-'}/><ViewRow label="Area / Village" value={user?.village||'-'}/><ViewRow label="Address" value={user?.address||'-'}/><ViewRow label="Gender" value={user?.gender||'-'}/><ViewRow label="Mobile" value={user?.mobileMasked||'Protected'}/>
            <div className="grid gap-3 sm:grid-cols-3">
              <StateCard icon={user?.isPrivate?<Lock/>:<Unlock/>} label="Profile" value={user?.isPrivate?'Private':'Public'}/>
              <StateCard icon={<Phone/>} label="Audio Calls" value={user?.allowCalls?'Enabled':'Disabled'}/>
              <StateCard icon={<MessageCircle/>} label="Messages" value={user?.allowMessages?'Enabled':'Disabled'}/>
            </div>
          </>:<form onSubmit={save} className="space-y-4">
            <div className="flex items-center justify-between"><div><p className="font-black text-slate-900">Edit Profile</p><p className="text-xs text-slate-400">Changes save only after you tap Update Profile.</p></div><button type="button" onClick={()=>{setEditing(false);sync(user)}} className="rounded-xl border p-2"><X size={17}/></button></div>
            <div className="flex gap-2"><label className="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-extrabold"><Camera size={15}/>Change Photo<input type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)setCropFile(f);e.target.value=''}}/></label>{user?.profilePhotoUrl&&<button type="button" onClick={removePhoto} className="flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-xs font-extrabold text-red-600"><Trash2 size={14}/>Remove</button>}</div>
            <label className="block"><span className="mb-1.5 block text-sm font-bold">Name</span><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full rounded-xl border bg-slate-50 px-3 py-2.5"/></label>
            <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-bold">Area / Village</span><input value={form.village} onChange={e=>setForm({...form,village:e.target.value})} className="w-full rounded-xl border bg-slate-50 px-3 py-2.5"/></label><label><span className="mb-1.5 block text-sm font-bold">Gender</span><select value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})} className="w-full rounded-xl border bg-slate-50 px-3 py-2.5"><option value="male">Male</option><option value="female">Female</option><option value="other">Other / Prefer not to say</option></select></label></div>
            <label className="block"><span className="mb-1.5 block text-sm font-bold">Full Address</span><textarea rows="3" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} className="w-full rounded-xl border bg-slate-50 px-3 py-2.5"/></label>
            <section className="rounded-2xl border bg-slate-50 p-3"><p className="mb-3 font-black">Profile privacy</p><div className="grid grid-cols-2 gap-2"><button type="button" onClick={()=>setPrivacy(false)} className={`rounded-xl px-3 py-2.5 text-sm font-extrabold ${!user?.isPrivate?'bg-blue-600 text-white':'border bg-white'}`}>Public</button><button type="button" onClick={()=>setPrivacy(true)} className={`rounded-xl px-3 py-2.5 text-sm font-extrabold ${user?.isPrivate?'bg-slate-900 text-white':'border bg-white'}`}>Private</button></div></section>
            <ContactToggle title="Allow in-app audio calls" text="No phone number is shared. Private accounts accept calls only from followers/following." checked={Boolean(user?.allowCalls)} onChange={n=>setContactPreference('allowCalls',n)}/>
            <ContactToggle title="Allow messages" text="Users can message you inside Namma Madurandhagam." checked={Boolean(user?.allowMessages)} onChange={n=>setContactPreference('allowMessages',n)}/>
            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-extrabold text-white"><Save size={18}/>{busy?'Updating...':'Update Profile'}</button>
          </form>}

          <div className="grid gap-3 pt-2 sm:grid-cols-3">
            <MenuLink to="/my-submissions" icon={<FileCheck2/>} title="My Submissions" text="Payments & status"/>
            <MenuLink to="/my-posts" icon={<Images/>} title="My Posts" text="Photos & videos"/>
            <MenuLink to="/call-history" icon={<Phone/>} title="Call History" text="Incoming & outgoing"/>
          </div>
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-[26px] border bg-white shadow-sm"><div className="border-b bg-slate-50 px-5 py-4"><p className="font-black">Help & Legal</p></div><div className="divide-y">
        <LegalLink to="/terms-and-conditions" icon={<FileText/>} title="Terms & Conditions"/>
        <LegalLink to="/privacy-policy" icon={<ShieldCheck/>} title="Privacy Policy"/>
        <LegalLink to="/refund-cancellation" icon={<RefreshCcw/>} title="Refund & Cancellation Policy"/>
        <LegalLink to="/pricing-services" icon={<IndianRupee/>} title="Pricing & Services"/>
        <LegalLink to="/shipping-delivery" icon={<Truck/>} title="Shipping & Delivery Policy"/>
        <LegalLink to="/contact-us" icon={<Headphones/>} title="Contact Us"/>
      </div></section>
      <button onClick={logout} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 font-extrabold text-red-700"><LogOut size={19}/>Logout</button>
    </main>
    <ProfilePhotoCropper file={cropFile} onCancel={()=>setCropFile(null)} onApply={async blob=>{await uploadPhoto(blob);setCropFile(null)}}/>
  </>;
}

function ViewRow({label,value}){return <div className="rounded-2xl border bg-slate-50 px-4 py-3"><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-1 font-extrabold text-slate-900">{value}</p></div>}
function StateCard({icon,label,value}){return <div className="rounded-2xl border p-3"><span className="text-blue-600">{icon}</span><p className="mt-2 text-xs font-bold text-slate-400">{label}</p><p className="font-black">{value}</p></div>}
function ContactToggle({title,text,checked,onChange}){return <div className="flex items-center gap-3 rounded-2xl border bg-slate-50 p-3"><div className="min-w-0 flex-1"><p className="font-extrabold">{title}</p><p className="text-[11px] leading-5 text-slate-500">{text}</p></div><button type="button" onClick={()=>onChange(!checked)} className={`relative h-7 w-12 rounded-full ${checked?'bg-blue-600':'bg-slate-300'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow ${checked?'left-6':'left-1'}`}/></button></div>}
function MenuLink({to,icon,title,text}){return <Link to={to} className="flex items-center gap-3 rounded-2xl border p-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">{icon}</span><div><p className="font-bold">{title}</p><p className="text-[11px] text-slate-400">{text}</p></div></Link>}
function LegalLink({to,icon,title}){return <Link to={to} className="flex items-center gap-3 px-4 py-3.5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">{icon}</span><p className="flex-1 font-extrabold">{title}</p><ChevronRight size={18} className="text-slate-400"/></Link>}
