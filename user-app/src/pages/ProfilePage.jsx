import { Camera, FileCheck2, Images, Lock, LogOut, MessageCircle, Phone, Save, ShieldCheck, Trash2, Unlock, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { clearUserSession, getUser, getUserToken, updateStoredUser } from '../lib/session';
import UserAvatar from '../components/UserAvatar';
import ProfilePhotoCropper from '../components/ProfilePhotoCropper';

export default function ProfilePage(){
  const token=getUserToken(),nav=useNavigate();
  const [user,setUser]=useState(getUser());
  const [form,setForm]=useState({name:user?.name||'',village:user?.village||'',address:user?.address||'',gender:user?.gender||'other'});
  const [summary,setSummary]=useState({counts:{posts:0,followers:0,following:0},requestCount:0});
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
  const [cropFile,setCropFile]=useState(null);

  const sync=(next)=>{
    setUser(next);
    setForm({name:next?.name||'',village:next?.village||'',address:next?.address||'',gender:next?.gender||'other'});
    updateStoredUser(next);
  };
  const loadSummary=()=>api('/social/me/summary',{token}).then(setSummary).catch(()=>{});

  useEffect(()=>{
    api('/auth/user/me',{token}).then(r=>sync(r.user)).catch(()=>{});
    loadSummary();
  },[]);

  const logout=()=>{clearUserSession();nav('/login',{replace:true})};

  const save=async(e)=>{
    e.preventDefault();
    setBusy(true);setError('');setNotice('');
    try{
      const r=await api('/auth/user/profile',{token,method:'PATCH',body:JSON.stringify(form)});
      sync(r.user);
      setNotice('Profile updated successfully.');
    }catch(e){setError(e.message)}
    finally{setBusy(false)}
  };

  const uploadPhoto=async(blob)=>{
    if(!blob)return;
    setBusy(true);setError('');setNotice('');
    try{
      const fd=new FormData();
      fd.append('file',blob,'profile.jpg');
      const uploaded=await api('/upload/user/avatar',{token,method:'POST',body:fd});
      const r=await api('/auth/user/profile',{token,method:'PATCH',body:JSON.stringify({profilePhotoUrl:uploaded.url,profilePhotoPublicId:uploaded.publicId})});
      sync(r.user);
      setNotice('Profile photo updated.');
    }catch(e){setError(e.message)}
    finally{setBusy(false)}
  };

  const removePhoto=async()=>{
    setBusy(true);setError('');
    try{
      const r=await api('/auth/user/profile',{token,method:'PATCH',body:JSON.stringify({profilePhotoUrl:'',profilePhotoPublicId:''})});
      sync(r.user);
      setNotice('Profile photo removed.');
    }catch(e){setError(e.message)}
    finally{setBusy(false)}
  };

  const setPrivacy=async(next)=>{
    if(busy||Boolean(user?.isPrivate)===next)return;
    setBusy(true);setError('');setNotice('');
    try{
      const r=await api('/social/privacy',{token,method:'PATCH',body:JSON.stringify({isPrivate:next})});
      sync({...user,isPrivate:r.user.isPrivate});
      await loadSummary();
      setNotice(next?'Your profile is now private. Only accepted followers can view your posts.':'Your profile is now public. Pending follow requests were accepted automatically.');
    }catch(e){setError(e.message)}
    finally{setBusy(false)}
  };

  const setContactPreference=async(key,next)=>{
    if(busy||Boolean(user?.[key])===next)return;
    setBusy(true);setError('');setNotice('');
    try{
      const r=await api('/auth/user/profile',{token,method:'PATCH',body:JSON.stringify({[key]:next})});
      sync(r.user);
      setNotice(key==='allowCalls'
        ?(next?'Call option is ON. Other users can call you from your profile.':'Call option is OFF.')
        :(next?'In-app message option is ON. Other users can message you.':'In-app message option is OFF.'));
    }catch(e){setError(e.message)}
    finally{setBusy(false)}
  };

  const c=summary?.counts||{};
  const dirty=Boolean(
    form.name!==(user?.name||'')||
    form.village!==(user?.village||'')||
    form.address!==(user?.address||'')||
    form.gender!==(user?.gender||'other')
  );

  return <>
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      <section className="overflow-hidden rounded-[30px] border bg-white shadow-sm">
        <div className="bg-gradient-to-r from-blue-700 to-sky-500 p-6 text-white">
          <div className="flex flex-wrap items-center gap-4">
            <UserAvatar user={user} sizeClass="h-24 w-24" iconSize={40} className="ring-4 ring-white/25"/>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-black">{user?.name}</h1>
              <p className="mt-1 text-sm text-blue-100">Namma Madurandhagam Member</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs font-extrabold ring-1 ring-white/20">
                  <Camera size={15}/> Change Photo
                  <input type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)setCropFile(f);e.target.value=''}}/>
                </label>
                {user?.profilePhotoUrl&&<button type="button" disabled={busy} onClick={removePhoto} className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs font-extrabold ring-1 ring-white/20"><Trash2 size={14}/> Remove</button>}
              </div>
              <p className="mt-2 text-[11px] font-semibold text-blue-100">Photo select pannina drag + zoom panni exact portion crop pannitu Apply kudukkalaam.</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/15">
            <Link to={user?.id?`/profile/${user.id}`:'/profile'} className="p-3 text-center"><p className="text-xl font-black">{c.posts||0}</p><p className="text-[11px] font-bold text-blue-100">Posts</p></Link>
            <Link to={user?.id?`/profile/${user.id}/followers`:'/profile'} className="border-x border-white/15 p-3 text-center"><p className="text-xl font-black">{c.followers||0}</p><p className="text-[11px] font-bold text-blue-100">Followers</p></Link>
            <Link to={user?.id?`/profile/${user.id}/following`:'/profile'} className="p-3 text-center"><p className="text-xl font-black">{c.following||0}</p><p className="text-[11px] font-bold text-blue-100">Following</p></Link>
          </div>
          {!!summary?.requestCount&&<Link to="/follow-requests" className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black text-blue-700"><UserPlus size={14}/>{summary.requestCount} follow request{summary.requestCount===1?'':'s'}</Link>}
        </div>

        <form onSubmit={save} data-auto-sync-pause={dirty?'true':undefined} className="space-y-4 p-5">
          {error&&<p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
          {notice&&<p className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{notice}</p>}

          <section className="rounded-2xl border bg-slate-50 p-3">
            <div className="mb-3">
              <p className="font-black text-slate-900">Profile privacy</p>
              <p className="text-xs leading-5 text-slate-500">Public: everyone can view your profile posts. Private: only accepted followers can view them.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={()=>setPrivacy(false)} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-extrabold ${!user?.isPrivate?'bg-blue-600 text-white':'border bg-white text-slate-600'}`}><Unlock size={17}/>Public</button>
              <button type="button" onClick={()=>setPrivacy(true)} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-extrabold ${user?.isPrivate?'bg-slate-900 text-white':'border bg-white text-slate-600'}`}><Lock size={17}/>Private</button>
            </div>
            {user?.isPrivate&&<Link to="/follow-requests" className="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm font-extrabold text-blue-700"><span className="inline-flex items-center gap-2"><UserPlus size={16}/>Follow requests</span><span>{summary?.requestCount||0}</span></Link>}
          </section>

          <section className="rounded-2xl border bg-slate-50 p-3">
            <div className="mb-3">
              <p className="font-black text-slate-900">Contact options</p>
              <p className="text-xs leading-5 text-slate-500">Call and Message can be controlled separately. Your mobile number is never printed on another user's profile.</p>
            </div>
            <ContactToggle
              icon={<Phone size={19}/>}
              title="Allow calls"
              text="ON: other users see a Call button and it opens their normal phone dialer."
              checked={Boolean(user?.allowCalls)}
              disabled={busy}
              onChange={next=>setContactPreference('allowCalls',next)}
            />
            <div className="mt-2"/>
            <ContactToggle
              icon={<MessageCircle size={19}/>}
              title="Allow messages"
              text="ON: other users see Message and chat with you inside Namma Madurandhagam."
              checked={Boolean(user?.allowMessages)}
              disabled={busy}
              onChange={next=>setContactPreference('allowMessages',next)}
            />
          </section>

          <label className="block"><span className="mb-1.5 block text-sm font-bold">Name</span><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full rounded-xl border bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-400"/></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className="mb-1.5 block text-sm font-bold">Area / Village</span><input value={form.village} onChange={e=>setForm({...form,village:e.target.value})} className="w-full rounded-xl border bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-400"/></label>
            <label><span className="mb-1.5 block text-sm font-bold">Gender</span><select value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})} className="w-full rounded-xl border bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-400"><option value="male">Male</option><option value="female">Female</option><option value="other">Other / Prefer not to say</option></select></label>
          </div>
          <label className="block"><span className="mb-1.5 block text-sm font-bold">Full Address</span><textarea rows="3" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Door no, street, area, village..." className="w-full rounded-xl border bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-400"/></label>

          <div className="grid gap-2 rounded-2xl bg-slate-50 p-3 sm:grid-cols-2">
            <Info icon={<Phone/>} label="Mobile" value={user?.mobile?`+91 ${user.mobile}`:'-'}/>
            <Info icon={<ShieldCheck/>} label="Account" value="Mobile verified"/>
          </div>
          <p className="-mt-2 text-[11px] font-semibold text-slate-400">Your mobile number is visible only to you. If calls are ON, other users only see a Call button.</p>

          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-extrabold text-white disabled:opacity-50"><Save size={18}/>{busy?'Saving...':'Save Profile'}</button>

          <div className="grid gap-3 pt-1 sm:grid-cols-2">
            <Link to="/my-submissions" className="flex items-center gap-3 rounded-2xl border p-3 hover:bg-slate-50"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><FileCheck2/></span><div><p className="text-xs font-semibold text-slate-400">Status & payments</p><p className="font-bold text-slate-800">My Submissions</p></div></Link>
            <Link to="/my-posts" className="flex items-center gap-3 rounded-2xl border p-3 hover:bg-slate-50"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600"><Images/></span><div><p className="text-xs font-semibold text-slate-400">Photos & videos</p><p className="font-bold text-slate-800">My Posts</p></div></Link>
          </div>
        </form>
      </section>

      <button onClick={logout} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 font-extrabold text-red-700"><LogOut size={19}/> Logout</button>
    </main>

    <ProfilePhotoCropper
      file={cropFile}
      onCancel={()=>setCropFile(null)}
      onApply={async blob=>{await uploadPhoto(blob);setCropFile(null)}}
    />
  </>;
}

function ContactToggle({icon,title,text,checked,disabled,onChange}){
  return <div className="flex items-center gap-3 rounded-2xl bg-white p-3">
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">{icon}</span>
    <div className="min-w-0 flex-1"><p className="font-extrabold text-slate-900">{title}</p><p className="text-[11px] leading-5 text-slate-500">{text}</p></div>
    <button type="button" disabled={disabled} onClick={()=>onChange?.(!checked)} className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked?'bg-blue-600':'bg-slate-300'} disabled:opacity-50`} aria-pressed={checked}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${checked?'left-6':'left-1'}`}/>
    </button>
  </div>;
}

function Info({icon,label,value}){
  return <div className="flex items-center gap-3 rounded-xl p-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-blue-600 shadow-sm">{icon}</span><div><p className="text-xs font-semibold text-slate-400">{label}</p><p className="font-bold text-slate-800">{value}</p></div></div>;
}
