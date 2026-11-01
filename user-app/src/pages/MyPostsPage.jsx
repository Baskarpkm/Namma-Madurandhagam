import { Film, Image, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { getUser, getUserToken } from '../lib/session';
import { getMediaItems } from '../components/MediaCarousel';
import ContentCard from '../components/ContentCard';

const SCROLL_KEY='nm.myPosts.scrollY';
const FILTER_KEY='nm.myPosts.filter';
const RETURN_KEY='nm.myPosts.return';

export default function MyPostsPage(){
  const token=getUserToken();
  const me=getUser();
  const restored=useRef(false);
  const [items,setItems]=useState([]);
  const [filter,setFilter]=useState(()=>sessionStorage.getItem(FILTER_KEY)||'all');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);

  const load=()=>{
    setLoading(true);setError('');
    api('/content/user/mine',{token})
      .then(data=>setItems((data||[]).filter(x=>x.type==='post'&&x.status==='approved'&&getMediaItems(x).length)))
      .catch(e=>setError(e.message))
      .finally(()=>setLoading(false));
  };

  useEffect(()=>{load()},[]);

  const filtered=useMemo(()=>items.filter(item=>{
    const media=getMediaItems(item);
    const hasVideo=media.some(x=>x.type==='video');
    if(filter==='photo')return !hasVideo;
    if(filter==='video')return hasVideo;
    return true;
  }),[items,filter]);

  useEffect(()=>{
    if(loading||restored.current)return;
    restored.current=true;
    const shouldRestore=sessionStorage.getItem(RETURN_KEY)==='1';
    const y=Number(sessionStorage.getItem(SCROLL_KEY)||0);
    sessionStorage.removeItem(RETURN_KEY);
    if(shouldRestore&&Number.isFinite(y)&&y>0){
      requestAnimationFrame(()=>window.scrollTo({top:y,behavior:'auto'}));
    }
  },[loading,filtered.length]);

  const chooseFilter=next=>{
    setFilter(next);
    sessionStorage.setItem(FILTER_KEY,next);
    sessionStorage.setItem(SCROLL_KEY,'0');
  };

  const rememberPosition=e=>{
    if(!e.target.closest?.('a'))return;
    sessionStorage.setItem(RETURN_KEY,'1');
    sessionStorage.setItem(SCROLL_KEY,String(window.scrollY||0));
  };

  const author={
    id:me?.id||me?._id||null,
    name:me?.name||'You',
    username:me?.username||'',
    village:me?.village||'',
    address:me?.address||'',
    gender:me?.gender||'other',
    profilePhotoUrl:me?.profilePhotoUrl||''
  };

  const instagramItem=item=>({
    ...item,
    author,
    likeCount:Number(item.likeCount??item.likes?.length??0),
    commentCount:Number(item.commentCount??item.comments?.length??0),
    shareCount:Number(item.shareCount??0),
    likedByMe:Array.isArray(item.likes)&&author.id?item.likes.some(id=>String(id)===String(author.id)):Boolean(item.likedByMe)
  });

  return <main className="mx-auto max-w-2xl px-0 pb-28 pt-5 sm:px-4 md:pb-10">
    <div className="px-4 sm:px-0">
      <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black tracking-[.16em] text-blue-600">PROFILE</p><h1 className="mt-1 text-3xl font-black text-slate-950">My Posts</h1><p className="mt-1 text-sm text-slate-500">Only your approved photo/video posts appear here. Payment, pending and approval status stay separately under My Submissions.</p></div><button onClick={load} className="rounded-xl border bg-white p-2.5"><RefreshCw size={18}/></button></div>
      <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1.5"><FilterButton active={filter==='all'} onClick={()=>chooseFilter('all')} label="All"/><FilterButton active={filter==='photo'} onClick={()=>chooseFilter('photo')} label="Photos" icon={<Image size={15}/>}/><FilterButton active={filter==='video'} onClick={()=>chooseFilter('video')} label="Videos" icon={<Film size={15}/>}/></div>
      {error&&<p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
    </div>

    <div className="mt-5 space-y-3 sm:space-y-4">{loading?[1,2,3].map(i=><div key={i} className="mx-4 h-80 animate-pulse rounded-3xl bg-white sm:mx-0"/>):filtered.map(item=><div key={item._id} onClickCapture={rememberPosition}><ContentCard item={instagramItem(item)} feedMode/></div>)}{!loading&&!filtered.length&&<div className="mx-4 rounded-3xl border bg-white p-10 text-center sm:mx-0"><p className="font-black text-slate-700">No {filter==='all'?'':filter} posts yet.</p><p className="mt-1 text-sm text-slate-400">Approved photo/video posts will appear here. Pending and payment status remain under My Submissions.</p></div>}</div>
  </main>;
}

function FilterButton({active,onClick,label,icon}){
  return <button onClick={onClick} className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-extrabold transition ${active?'bg-blue-600 text-white shadow-sm':'text-slate-500 hover:bg-white'}`}>{icon}{label}</button>;
}
