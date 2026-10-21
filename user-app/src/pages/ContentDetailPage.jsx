import { ArrowLeft, CalendarDays, ExternalLink, Heart, MapPin, MessageCircle, Phone, Send, Share2, Tag, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { getUser, getUserToken } from '../lib/session';
import MediaCarousel, { getMediaItems } from '../components/MediaCarousel';
import UserAvatar from '../components/UserAvatar';

const hiddenMeta=new Set(['contactName','contactMobile','mediaItems','isEditRequest','sharesOriginalMedia','freeQuotaCounted']);
const labels={
  postCategory:'Post Category',advertiserName:'Advertiser / Business',companyName:'Company / Business',jobType:'Job Type',salary:'Salary',qualification:'Qualification',experience:'Experience',vacancies:'Vacancies',eventDate:'Event Date',eventTime:'Event Time',venue:'Venue',organizer:'Organizer',businessName:'Business Name',originalPrice:'Original Price',offerPrice:'Offer Price',validUntil:'Valid Until',offerCode:'Offer Code',businessCategory:'Business Category',address:'Address',openingHours:'Opening Hours',whatsapp:'WhatsApp',vehicleType:'Vehicle Type',makeModel:'Make / Model',year:'Year',fuel:'Fuel',kilometers:'Kilometres',ownerCount:'Owner Count',workerCategory:'Service Category',serviceCharge:'Service Charge',availability:'Availability'
};
const human=(key)=>labels[key]||key.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase());
const when=(date)=>date?new Date(date).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'';

export default function ContentDetailPage(){
  const {id}=useParams();
  const nav=useNavigate();
  const user=getUser();
  const token=getUserToken();
  const [item,setItem]=useState(null);
  const [error,setError]=useState('');
  const [commentText,setCommentText]=useState('');
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');

  const load=()=>api(`/content/public/${id}`,{token}).then(data=>{
    if(data.type==='status')return nav(`/story/${id}`,{replace:true});
    setItem(data);
  }).catch(e=>setError(e.message));

  useEffect(()=>{load()},[id]);
  const details=useMemo(()=>Object.entries(item?.meta||{}).filter(([k,v])=>!hiddenMeta.has(k)&&v!==''&&v!=null),[item]);

  const toggleLike=async()=>{
    if(!item||busy)return;
    setBusy(true);setNotice('');
    try{const data=await api(`/content/public/${id}/like`,{token,method:'POST'});setItem(x=>({...x,likedByMe:data.liked,likeCount:data.likeCount}))}catch(e){setNotice(e.message)}finally{setBusy(false)}
  };

  const addComment=async(e)=>{
    e.preventDefault();const text=commentText.trim();if(!text||busy)return;
    setBusy(true);setNotice('');
    try{const data=await api(`/content/public/${id}/comments`,{token,method:'POST',body:JSON.stringify({text})});setItem(x=>({...x,comments:[...(x.comments||[]),data.comment],commentCount:data.commentCount}));setCommentText('')}catch(err){setNotice(err.message)}finally{setBusy(false)}
  };

  const deleteComment=async(commentId)=>{
    if(busy)return;setBusy(true);setNotice('');
    try{const data=await api(`/content/public/${id}/comments/${commentId}`,{token,method:'DELETE'});setItem(x=>({...x,comments:(x.comments||[]).filter(c=>c._id!==commentId),commentCount:data.commentCount}))}catch(err){setNotice(err.message)}finally{setBusy(false)}
  };

  const sharePost=async()=>{
    if(!item||busy)return;
    const shareData={title:item.title||'Namma Madurandhagam',text:item.description||'',url:window.location.href};
    try{
      if(navigator.share)await navigator.share(shareData);else{await navigator.clipboard.writeText(window.location.href);setNotice('Post link copied.')}
      const data=await api(`/content/public/${id}/share`,{token,method:'POST'});setItem(x=>({...x,shareCount:data.shareCount}));
    }catch(e){if(e?.name!=='AbortError')setNotice(e.message||'Unable to share post')}
  };

  if(error)return <main className="mx-auto max-w-3xl px-4 py-10"><div className="rounded-3xl border bg-white p-8 text-center"><p className="font-bold text-red-600">{error}</p><button onClick={()=>nav(-1)} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-white">Go Back</button></div></main>;
  if(!item)return <main className="mx-auto max-w-3xl px-4 py-10"><div className="h-96 animate-pulse rounded-3xl bg-white"/></main>;

  const mediaItems=getMediaItems(item);

  if(item.type==='post'){
    const canModerate=String(item.ownerUserId||'')===String(user?.id||'');
    return <main className="mx-auto max-w-2xl px-0 pb-24 pt-0 sm:px-4 sm:pt-6 md:pb-10">
      <button onClick={()=>nav(-1)} className="m-4 flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-bold text-slate-600 sm:mx-0 sm:mt-0"><ArrowLeft size={17}/> Back</button>
      <article className="overflow-hidden border-y bg-white shadow-sm sm:rounded-[28px] sm:border">
        <header className="flex items-center gap-3 px-4 py-3.5"><UserAvatar user={item.author} sizeClass="h-11 w-11" iconSize={21}/><div className="min-w-0 flex-1"><p className="truncate font-black text-slate-900">{item.author?.name||'Namma Madurandhagam'}</p><p className="truncate text-xs font-semibold text-slate-400">{item.area?`${item.area} • `:''}{when(item.publishedAt||item.createdAt)}</p></div></header>

        {mediaItems.length>0&&<MediaCarousel item={item} controls showArrows={mediaItems.length>1} maxHeightClass="max-h-[72vh]"/>}

        <div className="px-4 pb-5 pt-3">
          <div className="flex items-center gap-1"><button disabled={busy} onClick={toggleLike} className={`rounded-full p-2 transition ${item.likedByMe?'text-rose-600':'text-slate-700 hover:bg-slate-100'}`} aria-label="Like"><Heart size={27} fill={item.likedByMe?'currentColor':'none'}/></button><button onClick={()=>document.getElementById('post-comment-box')?.focus()} className="rounded-full p-2 text-slate-700 hover:bg-slate-100" aria-label="Comment"><MessageCircle size={27}/></button><button onClick={sharePost} className="rounded-full p-2 text-slate-700 hover:bg-slate-100" aria-label="Share"><Share2 size={26}/></button></div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-extrabold text-slate-800"><span>{item.likeCount||0} likes</span><span>{item.commentCount||0} comments</span><span>{item.shareCount||0} shares</span></div>
          <div className="mt-3"><h1 className="text-xl font-black text-slate-950">{item.title}</h1><p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-6 text-slate-700">{item.description}</p></div>
          {notice&&<p className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">{notice}</p>}

          <section className="mt-5 border-t pt-4">
            <h2 className="font-black text-slate-900">Comments</h2>
            <div className="mt-3 space-y-3">{(item.comments||[]).length?(item.comments||[]).map(comment=>{const canDelete=String(comment.userId)===String(user?.id||'')||canModerate;return <div key={comment._id} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3"><UserAvatar user={{name:comment.userName,profilePhotoUrl:comment.userPhotoUrl,gender:comment.userGender}} sizeClass="h-9 w-9" iconSize={17}/><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="font-extrabold text-slate-900">{comment.userName}</p><span className="text-[11px] text-slate-400">{when(comment.createdAt)}</span></div><p className="mt-0.5 break-words text-sm leading-5 text-slate-700">{comment.text}</p></div>{canDelete&&<button disabled={busy} onClick={()=>deleteComment(comment._id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete comment"><Trash2 size={16}/></button>}</div>}):<p className="text-sm text-slate-400">No comments yet. Be the first to comment.</p>}</div>
            <form onSubmit={addComment} className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 focus-within:border-blue-400"><input id="post-comment-box" maxLength={500} value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Add a comment..." className="min-w-0 flex-1 px-2 py-2 text-sm outline-none"/><button disabled={busy||!commentText.trim()} className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white disabled:opacity-40"><Send size={18}/></button></form>
          </section>
        </div>
      </article>
    </main>
  }

  const isShop=item.type==='shop';
  return <main className="mx-auto max-w-4xl px-4 pb-28 pt-6 md:pb-10">
    <button onClick={()=>nav(-1)} className="mb-4 flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-bold text-slate-600"><ArrowLeft size={17}/> Back</button>
    <article className="overflow-hidden rounded-[30px] border bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b px-5 py-4"><UserAvatar user={item.author} sizeClass="h-11 w-11" iconSize={21}/><div className="min-w-0"><p className="truncate font-black text-slate-900">{item.author?.name||'Namma Madurandhagam'}</p><p className="truncate text-xs font-semibold text-slate-400">{item.area?`${item.area} • `:''}{when(item.publishedAt||item.createdAt)}</p></div></header>
      {mediaItems.length>0&&<MediaCarousel item={item} controls={mediaItems.some(x=>x.type==='video')} autoPlay={isShop} showArrows={mediaItems.length>1} maxHeightClass="max-h-[70vh]"/>}
      <div className="p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-blue-600"><Tag size={14}/>{isShop?'Business / Shop':item.type}{item.area&&<><span>•</span><span className="flex items-center gap-1"><MapPin size={13}/>{item.area}</span></>}</div>
        <h1 className="mt-2 text-3xl font-black text-slate-900">{item.title}</h1><p className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-7 text-slate-700">{item.description}</p>
        {isShop&&mediaItems.length>1&&<p className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">Photos auto-slide every few seconds. You can also swipe left/right or use the arrows.</p>}
        {details.length>0&&<div className="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">{details.map(([key,value])=><div key={key}><p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{human(key)}</p><p className="mt-1 whitespace-pre-wrap break-words font-bold text-slate-800">{String(value)}</p></div>)}</div>}
        <div className="mt-6 flex flex-wrap gap-3">{item.meta?.contactMobile&&<a href={`tel:${item.meta.contactMobile}`} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white"><Phone size={17}/> Call {item.meta.contactName||''}</a>}{item.linkUrl&&<a href={item.linkUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-extrabold text-blue-700"><ExternalLink size={17}/> Open Link</a>}{item.endsAt&&<span className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700"><CalendarDays size={17}/>{new Date(item.endsAt).toLocaleDateString()}</span>}</div>
        <div className="mt-6 border-t pt-4 text-xs text-slate-400">Published {when(item.publishedAt||item.createdAt)}</div>
      </div>
    </article>
  </main>
}
