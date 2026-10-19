import { ArrowLeft, Eye, Pause, Play, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { getUser, getUserToken } from '../lib/session';
import { getSeenStoryIds, markStorySeen } from '../lib/storySeen';
import UserAvatar from '../components/UserAvatar';

const STORY_MS=30000;
const when=(date)=>date?new Date(date).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'';
function buildGroups(stories=[]){
  const groups=new Map();
  for(const story of stories){
    const key=story.author?.id||story.ownerUserId||`admin:${story.author?.name||'Namma Madurandhagam'}`;
    if(!groups.has(key))groups.set(key,{key,author:story.author||{name:'User'},stories:[]});
    groups.get(key).stories.push(story);
  }
  return Array.from(groups.values()).map(group=>({...group,stories:group.stories.sort((a,b)=>new Date(a.publishedAt||a.createdAt)-new Date(b.publishedAt||b.createdAt))}));
}

export default function StoryViewPage(){
  const {id}=useParams(),nav=useNavigate(),token=getUserToken(),me=getUser();
  const videoRef=useRef(null),flashTimer=useRef(null),elapsedRef=useRef(0);
  const [groups,setGroups]=useState([]),[groupIndex,setGroupIndex]=useState(0),[storyIndex,setStoryIndex]=useState(0);
  const [progress,setProgress]=useState(0),[paused,setPaused]=useState(false),[flash,setFlash]=useState(null);
  const [error,setError]=useState(''),[loading,setLoading]=useState(true);
  const [viewerOpen,setViewerOpen]=useState(false),[viewers,setViewers]=useState([]),[viewCount,setViewCount]=useState(0);

  useEffect(()=>{let live=true;api('/content?type=status',{token}).then(items=>{if(!live)return;const nextGroups=buildGroups(items);let foundGroup=-1,foundStory=-1;nextGroups.some((group,gi)=>{const si=group.stories.findIndex(story=>String(story._id)===String(id));if(si>=0){foundGroup=gi;foundStory=si;return true}return false});if(foundGroup<0){setError('Story not found or expired.');return}setGroups(nextGroups);setGroupIndex(foundGroup);setStoryIndex(foundStory)}).catch(e=>setError(e.message)).finally(()=>live&&setLoading(false));return()=>{live=false;if(flashTimer.current)clearTimeout(flashTimer.current)}},[]);

  const group=groups[groupIndex],item=group?.stories?.[storyIndex]||null;
  const isOwner=Boolean(item?.author?.id&&me?.id&&String(item.author.id)===String(me.id));
  const firstStoryIndexForGroup=useCallback((nextGroup)=>{const seen=getSeenStoryIds();const unseenIndex=(nextGroup?.stories||[]).findIndex(story=>!seen.has(String(story._id)));return unseenIndex>=0?unseenIndex:0},[]);
  const advance=useCallback(()=>{if(!group)return;if(storyIndex<group.stories.length-1){setStoryIndex(v=>v+1);return}if(groupIndex<groups.length-1){const nextGroup=groups[groupIndex+1];setGroupIndex(v=>v+1);setStoryIndex(firstStoryIndexForGroup(nextGroup));return}nav('/',{replace:true})},[group,storyIndex,groupIndex,groups,firstStoryIndexForGroup,nav]);
  const loadViewers=useCallback(async(storyId)=>{try{const data=await api(`/content/public/${storyId}/views`,{token});setViewers(data.viewers||[]);setViewCount(Number(data.count||0))}catch{}},[token]);

  useEffect(()=>{
    if(!item)return;
    markStorySeen(item._id);elapsedRef.current=0;setProgress(0);setPaused(false);setFlash(null);setViewerOpen(false);setViewers([]);setViewCount(Number(item.storyViewCount||0));
    api(`/content/public/${item._id}/view`,{token,method:'POST'}).then(data=>{if(isOwner)setViewCount(Number(data.viewCount||0))}).catch(()=>{});
    if(isOwner)loadViewers(item._id);
    const video=videoRef.current;if(video){video.currentTime=0;video.play().catch(()=>{})}
  },[item?._id]);

  useEffect(()=>{if(!item||paused)return;const started=performance.now(),startElapsed=elapsedRef.current;const interval=setInterval(()=>{const elapsed=startElapsed+(performance.now()-started);elapsedRef.current=elapsed;const next=elapsed/STORY_MS;if(next>=1){clearInterval(interval);elapsedRef.current=STORY_MS;setProgress(1);setTimeout(advance,0)}else setProgress(next)},80);return()=>{clearInterval(interval);elapsedRef.current=Math.min(STORY_MS,startElapsed+(performance.now()-started))}},[item?._id,paused]);
  useEffect(()=>{const video=videoRef.current;if(!video||item?.mediaType!=='video')return;if(paused)video.pause();else video.play().catch(()=>{})},[paused,item?._id]);

  const flashControl=(icon)=>{setFlash(icon);if(flashTimer.current)clearTimeout(flashTimer.current);flashTimer.current=setTimeout(()=>setFlash(null),700)};
  const togglePause=()=>{if(viewerOpen)return;const next=!paused;setPaused(next);flashControl(next?'pause':'play')};
  const progressWidth=(index)=>index<storyIndex?'100%':index>storyIndex?'0%':`${Math.max(0,Math.min(100,progress*100))}%`;
  const openViewers=async(e)=>{e.stopPropagation();setPaused(true);setViewerOpen(true);await loadViewers(item._id)};
  const closeViewers=(e)=>{e?.stopPropagation();setViewerOpen(false);setPaused(false)};

  if(error)return <main className="grid min-h-screen place-items-center bg-black px-5 text-white"><div className="text-center"><p className="font-bold text-red-300">{error}</p><button onClick={()=>nav('/',{replace:true})} className="mt-4 rounded-xl bg-white/15 px-4 py-2 font-bold">Go Home</button></div></main>;
  if(loading||!item)return <main className="min-h-screen animate-pulse bg-slate-950"/>;

  return <main className="relative flex min-h-screen select-none items-center justify-center overflow-hidden bg-black text-white">
    <div className="absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/75 to-transparent px-3 pb-14 pt-3 sm:px-5">
      <div className="flex gap-1.5">{group.stories.map((story,index)=><div key={story._id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white transition-[width] duration-75" style={{width:progressWidth(index)}}/></div>)}</div>
      <div className="mt-3 flex items-center gap-3"><button onClick={(e)=>{e.stopPropagation();nav(-1)}} className="grid h-10 w-10 place-items-center rounded-full bg-black/30 backdrop-blur"><ArrowLeft size={22}/></button><UserAvatar user={item.author} sizeClass="h-10 w-10" iconSize={19} className="border-2 border-emerald-400"/><div className="min-w-0"><p className="truncate font-extrabold">{item.author?.name||'Namma Madurandhagam'}</p><p className="text-xs text-white/70">{when(item.publishedAt||item.createdAt)}</p></div></div>
    </div>

    <button type="button" onClick={togglePause} className="relative flex min-h-screen w-full max-w-3xl items-center justify-center bg-black" aria-label={paused?'Resume story':'Pause story'}>{item.mediaType==='video'?<video ref={videoRef} key={item._id} src={item.mediaUrl} autoPlay playsInline onEnded={advance} className="max-h-screen w-full object-contain"/>:<img key={item._id} src={item.mediaUrl} alt="" className="max-h-screen w-full object-contain"/>}{flash&&<span className="pointer-events-none absolute grid h-16 w-16 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm">{flash==='pause'?<Pause size={30} fill="currentColor"/>:<Play size={30} fill="currentColor"/>}</span>}</button>

    {item.description&&<div className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-5 pt-16 text-center ${isOwner?'pb-20':'pb-8'}`}><p className="mx-auto max-w-xl whitespace-pre-wrap text-sm font-semibold leading-6 text-white/95">{item.description}</p></div>}
    {isOwner&&<button onClick={openViewers} className="absolute bottom-5 left-5 z-40 flex items-center gap-2 rounded-full bg-black/45 px-4 py-2 text-sm font-extrabold text-white backdrop-blur"><Eye size={18}/><span>{viewCount} {viewCount===1?'view':'views'}</span></button>}

    {viewerOpen&&<div className="absolute inset-0 z-50 flex items-end bg-black/45" onClick={closeViewers}><section onClick={e=>e.stopPropagation()} className="max-h-[62vh] w-full overflow-hidden rounded-t-[28px] bg-white text-slate-900 shadow-2xl"><div className="flex items-center justify-between border-b px-5 py-4"><div><p className="text-lg font-black">Story viewers</p><p className="text-xs font-semibold text-slate-400">{viewCount} {viewCount===1?'view':'views'}</p></div><button onClick={closeViewers} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100"><X size={18}/></button></div><div className="max-h-[48vh] overflow-y-auto p-3">{viewers.length?viewers.map(v=><div key={v.id} className="flex items-center gap-3 rounded-2xl p-3 hover:bg-slate-50"><UserAvatar user={v} sizeClass="h-11 w-11" iconSize={21}/><div className="min-w-0 flex-1"><p className="truncate font-extrabold">{v.name}</p><p className="truncate text-xs text-slate-400">{v.village||'Namma Madurandhagam'} • {when(v.viewedAt)}</p></div></div>):<p className="py-10 text-center text-sm font-semibold text-slate-400">No views yet.</p>}</div></section></div>}
  </main>
}
