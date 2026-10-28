import { ArrowLeft, Lock, MapPin, MessageCircle, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { getUser, getUserToken } from '../lib/session';
import UserAvatar from '../components/UserAvatar';
import FollowButton from '../components/FollowButton';
import ContentCard from '../components/ContentCard';
import EmptyState from '../components/EmptyState';

export default function PublicProfilePage(){
  const {userId}=useParams(),token=getUserToken(),me=getUser(),nav=useNavigate();
  const [profile,setProfile]=useState(null),[posts,setPosts]=useState([]),[contact,setContact]=useState({canCall:false,canMessage:false,callHref:''});
  const [error,setError]=useState(''),[loading,setLoading]=useState(true);

  const load=async()=>{
    setLoading(true);setError('');
    try{
      const [p,c]=await Promise.all([
        api(`/social/profiles/${userId}`,{token}),
        api(`/contact/profile/${userId}`,{token}).catch(()=>({canCall:false,canMessage:false,callHref:''}))
      ]);
      setProfile(p);
      setContact(c||{});
      if(p.canViewContent){
        const rows=await api(`/social/profiles/${userId}/posts`,{token});
        setPosts(rows||[]);
      }else setPosts([]);
    }catch(e){setError(e.message)}
    finally{setLoading(false)}
  };

  useEffect(()=>{load()},[userId]);

  const onFollowChange=(next,previous)=>setProfile(p=>{
    if(!p)return p;
    let delta=0;
    if(previous==='accepted'&&next!=='accepted')delta=-1;
    if(previous!=='accepted'&&next==='accepted')delta=1;
    const canView=!p.user.isPrivate||next==='accepted'||String(me?.id||'')===String(userId);
    if(canView&&!p.canViewContent)setTimeout(load,0);
    return {...p,followStatus:next,canViewContent:canView,counts:{...p.counts,followers:Math.max(0,Number(p.counts?.followers||0)+delta)}};
  });

  if(loading)return <main className="mx-auto max-w-2xl px-4 py-8"><div className="h-64 animate-pulse rounded-3xl bg-white"/></main>;
  if(error||!profile)return <main className="mx-auto max-w-2xl px-4 py-8"><button onClick={()=>nav(-1)} className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-600"><ArrowLeft size={17}/>Back</button><div className="rounded-3xl border bg-white p-8 text-center font-bold text-red-600">{error||'Profile not found'}</div></main>;

  const own=String(me?.id||'')===String(userId);
  const {user,counts,followStatus,canViewContent}=profile;

  return <main className="mx-auto max-w-2xl pb-24 pt-4 sm:px-4 sm:pt-6">
    <button onClick={()=>nav(-1)} className="mx-4 mb-4 flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-bold text-slate-600 sm:mx-0"><ArrowLeft size={17}/>Back</button>

    <section className="border-y bg-white px-5 py-6 shadow-sm sm:rounded-[30px] sm:border">
      <div className="flex items-center gap-4">
        <UserAvatar user={user} sizeClass="h-24 w-24" iconSize={40}/>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-black text-slate-950">{user.name}</h1>
          {user.village&&<p className="mt-1 flex items-center gap-1 text-sm font-semibold text-slate-500"><MapPin size={14}/>{user.village}</p>}
          <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-slate-400">{user.isPrivate&&<Lock size={12}/>} {user.isPrivate?'Private account':'Public account'}</p>
        </div>
        {own?<Link to="/profile" className="rounded-xl border px-3 py-2 text-sm font-extrabold text-slate-700">Edit</Link>:<FollowButton userId={user.id} initialStatus={followStatus} onChange={onFollowChange}/>}
      </div>

      <div className="mt-6 grid grid-cols-3 border-y py-3 text-center">
        <Link to={`/profile/${user.id}`}><p className="text-xl font-black">{counts?.posts||0}</p><p className="text-xs font-bold text-slate-400">Posts</p></Link>
        <Link to={`/profile/${user.id}/followers`} className="border-x"><p className="text-xl font-black">{counts?.followers||0}</p><p className="text-xs font-bold text-slate-400">Followers</p></Link>
        <Link to={`/profile/${user.id}/following`}><p className="text-xl font-black">{counts?.following||0}</p><p className="text-xs font-bold text-slate-400">Following</p></Link>
      </div>

      {!own&&(contact?.canCall||contact?.canMessage)&&<div className={`mt-4 grid gap-2 ${contact?.canCall&&contact?.canMessage?'grid-cols-2':'grid-cols-1'}`}>
        {contact?.canCall&&contact?.callHref&&<a href={contact.callHref} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white"><Phone size={18}/>Call</a>}
        {contact?.canMessage&&<Link to={`/chat/${user.id}`} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-extrabold text-white"><MessageCircle size={18}/>Message</Link>}
      </div>}
      {!own&&!contact?.canCall&&!contact?.canMessage&&<p className="mt-4 text-center text-xs font-semibold text-slate-400">This user has not enabled call or message contact options.</p>}
    </section>

    <div className="mt-4 border-y bg-white py-3 text-center text-sm font-black text-slate-900 sm:rounded-2xl sm:border">Posts</div>
    {!canViewContent
      ?<div className="mx-4 mt-4 rounded-3xl border bg-white p-8 text-center sm:mx-0"><Lock className="mx-auto text-slate-400" size={34}/><h2 className="mt-3 font-black text-slate-900">This account is private</h2><p className="mt-1 text-sm leading-6 text-slate-500">Follow this user and wait for approval to see their posts, followers and following.</p></div>
      :posts.length
        ?<div className="mt-2 space-y-3">{posts.map(item=><ContentCard key={item._id} item={item} feedMode/>)}</div>
        :<div className="px-4"><EmptyState title="No posts yet" text="Approved posts from this user will appear here."/></div>}
  </main>;
}
