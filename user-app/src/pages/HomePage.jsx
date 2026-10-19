import { BriefcaseBusiness, Car, ChevronRight, LayoutGrid, Megaphone, Plus, Search, Store, UserRoundCog, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import ContentCard from '../components/ContentCard';
import EmptyState from '../components/EmptyState';
import UserAvatar from '../components/UserAvatar';
import { getUser, getUserToken } from '../lib/session';
import { firstUnseenStory, getSeenStoryIds } from '../lib/storySeen';

const main=[
  {title:'Businesses',path:'/shops',Icon:Store},
  {title:'Jobs',path:'/jobs',Icon:BriefcaseBusiness},
  {title:'Vehicles',path:'/vehicles',Icon:Car},
  {title:'Events',path:'/events',Icon:Megaphone},
  {title:'Offers',path:'/offers',Icon:Zap},
  {title:'Posts',path:'/updates',Icon:Megaphone}
];

function storyGroups(stories=[]){
  const groups=new Map();
  for(const story of stories){
    const key=story.author?.id||story.ownerUserId||`admin:${story.author?.name||'Namma Madurandhagam'}`;
    if(!groups.has(key))groups.set(key,{key,author:story.author||{name:'User'},stories:[]});
    groups.get(key).stories.push(story);
  }
  return Array.from(groups.values()).map(group=>({
    ...group,
    stories:group.stories.sort((a,b)=>new Date(a.publishedAt||a.createdAt)-new Date(b.publishedAt||b.createdAt))
  }));
}

export default function HomePage(){
  const nav=useNavigate(),user=getUser(),token=getUserToken();
  const bannerRef=useRef(null);
  const [bannerIndex,setBannerIndex]=useState(0);
  const [data,setData]=useState({banners:[],stories:[],posts:[],offers:[],workers:[],categories:[]}),[loading,setLoading]=useState(true);
  useEffect(()=>{Promise.all([
    api('/content?type=banner',{token}),
    api('/content?type=status',{token}),
    api('/content?type=post',{token}),
    api('/content?type=offer',{token}),
    api('/content?type=worker',{token}),
    api('/content?type=category',{token})
  ]).then(([banners,stories,posts,offers,workers,categories])=>setData({banners,stories,posts,offers,workers,categories})).catch(()=>{}).finally(()=>setLoading(false))},[]);


  useEffect(()=>{
    if(data.banners.length<2)return;
    const id=setInterval(()=>{
      setBannerIndex(prev=>{
        const next=(prev+1)%data.banners.length;
        const el=bannerRef.current;
        const child=el?.children?.[next];
        if(el&&child)el.scrollTo({left:child.offsetLeft,behavior:'smooth'});
        return next;
      });
    },5000);
    return ()=>clearInterval(id);
  },[data.banners.length]);
  const syncBannerIndex=()=>{
    const el=bannerRef.current;if(!el||!data.banners.length)return;
    const positions=Array.from(el.children).map((child,i)=>({i,d:Math.abs(el.scrollLeft-child.offsetLeft)}));
    positions.sort((a,b)=>a.d-b.d);
    setBannerIndex(positions[0]?.i||0);
  };

  const groups=useMemo(()=>storyGroups(data.stories),[data.stories]);
  const seen=getSeenStoryIds();

  return <main className="mx-auto max-w-6xl space-y-7 px-4 pb-24 pt-5 md:pb-10">
    <section><p className="text-sm font-semibold text-slate-500">Vanakkam, <b className="text-slate-800">{user?.name||'Friend'}</b> 👋</p><div onClick={()=>nav('/search')} className="mt-3 flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm"><Search className="text-slate-400" size={20}/><span className="text-sm text-slate-400">Search businesses, workers, jobs, vehicles...</span></div></section>

    <section><div ref={bannerRef} onScroll={syncBannerIndex} className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-1">{data.banners.length?data.banners.map(b=><article key={b._id} className="relative min-w-full snap-center overflow-hidden rounded-[30px] bg-blue-700 shadow-xl shadow-blue-100 sm:min-w-[78%]"><div className="relative h-52 sm:h-64"><img src={b.mediaUrl} className="h-full w-full object-cover"/><div className="absolute inset-0 bg-gradient-to-r from-blue-950/85 via-blue-900/40 to-transparent"/><div className="absolute inset-y-0 left-0 flex max-w-lg flex-col justify-center p-6 text-white"><div className="mb-3 flex items-center gap-2"><UserAvatar user={b.author} sizeClass="h-8 w-8" iconSize={15}/><span className="text-xs font-extrabold">{b.author?.name||'Namma Madurandhagam'}</span></div><p className="text-xs font-extrabold tracking-[.18em] text-blue-100">NAMMA MADURANDHAGAM</p><h1 className="mt-2 text-3xl font-black">{b.title}</h1><p className="mt-2 text-sm text-blue-50">{b.description}</p></div></div></article>):<article className="relative min-w-full overflow-hidden rounded-[30px] bg-gradient-to-r from-blue-800 via-blue-600 to-sky-400 p-7 text-white shadow-xl shadow-blue-100"><p className="text-xs font-extrabold tracking-[.18em] text-blue-100">OUR PEOPLE • OUR PLACE • OUR GROWTH</p><h1 className="mt-2 max-w-xl text-3xl font-black sm:text-4xl">Everything Madurandhagam, in one place.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-blue-50">Businesses, workers, jobs, vehicles, events, offers and local posts.</p></article>}</div>{data.banners.length>1&&<div className="mt-3 flex justify-center gap-1.5">{data.banners.map((_,i)=><span key={i} className={`h-2 rounded-full transition-all ${i===bannerIndex?'w-6 bg-blue-600':'w-2 bg-slate-300'}`}/>)}</div>}</section>

    <section>
      <div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-black">Stories</h2><Link to="/post?type=status" className="text-sm font-bold text-blue-600">+ Add Story</Link></div>
      <div className="flex snap-x gap-3 overflow-x-auto pb-2">
        {groups.map(group=>{
          const unseen=group.stories.some(story=>!seen.has(String(story._id)));
          const openStory=firstUnseenStory(group.stories)||group.stories[0];
          return <Link to={`/story/${openStory?._id}`} key={group.key} className="w-24 shrink-0 snap-start text-center">
            <div className={`mx-auto grid h-20 w-20 place-items-center rounded-full border-4 bg-white p-[2px] ${unseen?'border-emerald-500':'border-slate-300'}`}>
              <UserAvatar user={group.author} sizeClass="h-full w-full" iconSize={30}/>
            </div>
            <p className="mt-1 truncate text-xs font-bold">{group.author?.name||'User'}</p>
          </Link>
        })}

        <Link to="/post?type=status" className="w-24 shrink-0 snap-start text-center">
          <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-full border-2 border-dashed border-blue-300 bg-blue-50 text-blue-600">
            <Plus size={30}/>
          </div>
          <p className="mt-1 truncate text-xs font-bold text-blue-700">Add Story</p>
        </Link>
      </div>
    </section>

    <section><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-black">Explore</h2><Link to="/search" className="text-sm font-bold text-blue-600">Search all</Link></div><div className="grid grid-cols-3 gap-3 sm:grid-cols-6">{(data.categories.length?data.categories:null)?.map(cat=><Link to={cat.linkUrl||'/search'} key={cat._id} className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><span className="mx-auto grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-blue-50 text-blue-600">{cat.mediaUrl?<img src={cat.mediaUrl} className="h-full w-full object-cover"/>:<LayoutGrid size={23}/>}</span><span className="mt-2 block truncate text-xs font-extrabold sm:text-sm">{cat.title}</span></Link>)||main.map(({title,path,Icon})=><Link to={path} key={title} className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Icon size={23}/></span><span className="mt-2 block text-xs font-extrabold sm:text-sm">{title}</span></Link>)}</div></section>

    <Link to="/workers" className="flex items-center gap-4 rounded-3xl border bg-white p-5 shadow-sm"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-600 text-white"><UserRoundCog size={27}/></span><div className="min-w-0 flex-1"><h3 className="font-black">Local Workers</h3><p className="text-sm text-slate-500">Find plumbers, electricians, mechanics and repair professionals.</p></div><ChevronRight className="text-slate-400"/></Link>

    <section><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-black">Latest Posts</h2><Link to="/updates" className="flex items-center text-sm font-bold text-blue-600">More <ChevronRight size={16}/></Link></div>{loading?<div className="h-40 animate-pulse rounded-3xl bg-white"/>:data.posts.length?<div className="grid gap-4 md:grid-cols-2">{data.posts.slice(0,4).map(x=><ContentCard key={x._id} item={x} compact/>)}</div>:<EmptyState title="No posts yet" text="Approved public posts will appear here."/>}</section>

    {data.offers.length>0&&<section><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-black">Local Offers</h2><Link to="/offers" className="text-sm font-bold text-blue-600">View all</Link></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.offers.slice(0,3).map(x=><ContentCard key={x._id} item={x} compact/>)}</div></section>}
  </main>
}
