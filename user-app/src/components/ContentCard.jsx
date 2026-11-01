import { ArrowRight, Flag, Heart, MapPin, MessageCircle, MoreHorizontal, Share2, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { getUser, getUserToken } from '../lib/session';
import MediaCarousel, { getMediaItems } from './MediaCarousel';
import UserAvatar from './UserAvatar';
import FollowButton from './FollowButton';
import ExpandablePostText from './ExpandablePostText';

const reasons=[['spam','Spam'],['false-information','False information'],['harassment','Harassment'],['inappropriate','Inappropriate content'],['scam','Scam / fraud'],['other','Other']];

export default function ContentCard({ item, compact = false, feedMode = false }) {
  const isPost=item.type==='post',detailPath=item.type==='offer'?`/offer/${item._id}`:`/view/${item._id}`;
  const nav=useNavigate(),location=useLocation(),token=getUserToken(),me=getUser(),mediaItems=getMediaItems(item);
  const typeLabel=item.type==='shop'?'Business / Shop':isPost?'Post':item.type;
  const [liked,setLiked]=useState(Boolean(item.likedByMe)),[likeCount,setLikeCount]=useState(Number(item.likeCount||0)),[shareCount,setShareCount]=useState(Number(item.shareCount||0)),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const [menu,setMenu]=useState(false),[reportOpen,setReportOpen]=useState(false),[reason,setReason]=useState('spam'),[details,setDetails]=useState('');
  const profilePath=item.author?.id?`/profile/${item.author.id}`:'',isOwn=Boolean(item.author?.id&&String(item.author.id)===String(me?.id||''));
  const openActionTarget=()=>{const target=String(item.linkUrl||'').trim();if(!target)return;if(/^https?:\/\//i.test(target)){window.open(target,'_blank','noopener,noreferrer');return}nav(target)};
  const rememberFeedPosition=event=>{if(!(feedMode||isPost))return;const anchor=event.target?.closest?.('a');if(!anchor)return;const href=anchor.getAttribute('href')||'';if(!href.startsWith(detailPath))return;try{sessionStorage.setItem('nm-feed-return',JSON.stringify({path:`${location.pathname}${location.search}`,y:window.scrollY,itemId:String(item._id),detailPath}))}catch{}};

  const toggleLike=async()=>{if(!isPost||busy)return;setBusy(true);setNotice('');try{const data=await api(`/content/public/${item._id}/like`,{token,method:'POST'});setLiked(Boolean(data.liked));setLikeCount(Number(data.likeCount||0))}catch(e){setNotice(e.message||'Unable to like post')}finally{setBusy(false)}};
  const sharePost=async()=>{if(!isPost||busy)return;const url=`${window.location.origin}/view/${item._id}`;setBusy(true);setNotice('');try{if(navigator.share)await navigator.share({title:item.title||'Namma Madurandhagam',text:item.description||'',url});else{await navigator.clipboard.writeText(url);setNotice('Post link copied')}const data=await api(`/content/public/${item._id}/share`,{token,method:'POST'});setShareCount(Number(data.shareCount||0))}catch(e){if(e?.name!=='AbortError')setNotice(e.message||'Unable to share post')}finally{setBusy(false)}};
  const submitReport=async()=>{setBusy(true);setNotice('');try{const r=await api(`/reports/post/${item._id}`,{token,method:'POST',body:JSON.stringify({reason,details})});setReportOpen(false);setMenu(false);setDetails('');setNotice(r.message||'Report submitted to admin.')}catch(e){setNotice(e.message||'Unable to report post')}finally{setBusy(false)}};

  const authorBlock=<><UserAvatar user={item.author} sizeClass="h-10 w-10" iconSize={19}/><div className="min-w-0"><p className="truncate text-sm font-black text-slate-900">{item.author?.name||'Namma Madurandhagam'}</p><p className="flex items-center gap-1 truncate text-[11px] font-semibold text-slate-400">{item.area&&<><MapPin size={11}/>{item.area}<span>•</span></>}<span className="uppercase">{typeLabel}</span></p></div></>;
  const edgeFeed=isPost||feedMode;
  return <>
    <article onClickCapture={rememberFeedPosition} className={edgeFeed?'group overflow-hidden border-y border-slate-200 bg-white':'group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm'}>
      <header className="flex items-center gap-3 p-4 pb-3">
        {profilePath?<Link to={profilePath} className="flex min-w-0 flex-1 items-center gap-3">{authorBlock}</Link>:<div className="flex min-w-0 flex-1 items-center gap-3">{authorBlock}</div>}
        {isPost&&item.author?.id&&!isOwn&&<FollowButton userId={item.author.id} initialStatus={item.author.followStatus||'none'} compact/>}
        {isPost&&!isOwn&&<div className="relative"><button onClick={()=>setMenu(x=>!x)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><MoreHorizontal size={20}/></button>{menu&&<div className="absolute right-0 top-10 z-30 w-44 overflow-hidden rounded-2xl border bg-white shadow-xl"><button onClick={()=>setReportOpen(true)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-black text-red-600 hover:bg-red-50"><Flag size={16}/>Report post</button></div>}</div>}
      </header>
      {mediaItems.length?<MediaCarousel item={item} linkTo={detailPath} controls={false} autoPlayVideo={isPost} playOverlay={!isPost}/>:<Link to={detailPath} className={`${compact?'h-24':'h-32'} grid place-items-center bg-gradient-to-br from-blue-600 to-sky-400 text-4xl font-black text-white/90`}>NM</Link>}
      <div className="p-4">
        <Link to={detailPath} className="block text-lg font-black leading-snug text-slate-900 hover:text-blue-700">{item.title}</Link>
        {item.description&&(isPost?<ExpandablePostText text={item.description} className="mt-2"/>:<p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{item.description}</p>)}
        {item.price!=null&&item.price!==''&&<p className="mt-3 text-lg font-black text-blue-700">₹{Number(item.price).toLocaleString('en-IN')}</p>}
        {isPost?<div className="mt-4 border-t pt-3"><div className="flex items-center gap-1"><button disabled={busy} onClick={toggleLike} className={`flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-extrabold ${liked?'text-rose-600':'text-slate-600'}`}><Heart size={18} fill={liked?'currentColor':'none'}/><span>{likeCount}</span></button><Link to={detailPath} className="flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-extrabold text-slate-600"><MessageCircle size={18}/><span>{item.commentCount||0}</span></Link><button disabled={busy} onClick={sharePost} className="flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-extrabold text-slate-600"><Share2 size={18}/><span>{shareCount}</span></button><Link to={detailPath} className="ml-auto text-xs font-extrabold text-blue-600">View</Link></div>{notice&&<p className="mt-2 text-[11px] font-bold text-blue-600">{notice}</p>}</div>:item.type==='offer'&&item.linkUrl?<button type="button" onClick={openActionTarget} className="mt-4 flex w-full items-center justify-between border-t pt-3 text-sm font-extrabold text-blue-600"><span>Open offer</span><ArrowRight size={17}/></button>:<Link to={detailPath} className="mt-4 flex items-center justify-between border-t pt-3 text-sm font-extrabold text-blue-600"><span>View details</span><ArrowRight size={17}/></Link>}
      </div>
    </article>

    {reportOpen&&<div className="fixed inset-0 z-[190] grid place-items-center bg-slate-950/60 p-4" onClick={()=>setReportOpen(false)}><div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.14em] text-red-600">Report post</p><h3 className="text-xl font-black">Why are you reporting this?</h3></div><button onClick={()=>setReportOpen(false)} className="rounded-xl border p-2"><X size={18}/></button></div><div className="mt-4 grid grid-cols-2 gap-2">{reasons.map(([v,l])=><button key={v} onClick={()=>setReason(v)} className={`rounded-xl border px-3 py-2 text-sm font-bold ${reason===v?'border-red-500 bg-red-50 text-red-700':'text-slate-600'}`}>{l}</button>)}</div><textarea rows="3" value={details} onChange={e=>setDetails(e.target.value)} placeholder="Optional details" className="mt-3 w-full rounded-2xl border p-3 text-sm outline-none"/><button disabled={busy} onClick={submitReport} className="mt-3 w-full rounded-2xl bg-red-600 px-4 py-3 font-black text-white">{busy?'Submitting...':'Submit Report'}</button></div></div>}
  </>;
}
