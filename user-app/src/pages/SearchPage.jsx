import { AtSign, Lock, Search, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ListingPage from './ListingPage';
import { api } from '../lib/api';
import { getUserToken } from '../lib/session';
import UserAvatar from '../components/UserAvatar';

const options=[['people','People'],['shop','Shops'],['worker','Workers'],['job','Jobs'],['vehicle','Vehicles'],['service','Services'],['event','Events'],['offer','Offers'],['post','Updates']];

export default function SearchPage(){
  const token=getUserToken();
  const [type,setType]=useState('people');
  const [q,setQ]=useState('');
  const [people,setPeople]=useState([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{
    if(type!=='people'){setPeople([]);return}
    const query=q.trim();
    if(query.length<2){setPeople([]);setError('');return}
    let live=true;setLoading(true);setError('');
    const id=setTimeout(()=>api(`/user-search?q=${encodeURIComponent(query)}`,{token,fresh:true}).then(data=>{if(live)setPeople(data.items||[])}).catch(e=>{if(live)setError(e.message)}).finally(()=>{if(live)setLoading(false)}),250);
    return()=>{live=false;clearTimeout(id)};
  },[type,q,token]);

  return <div>
    <main className="mx-auto max-w-6xl px-4 pt-5">
      <div className="flex gap-2 overflow-x-auto pb-1">{options.map(([v,l])=><button onClick={()=>setType(v)} key={v} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${type===v?'bg-blue-600 text-white':'border bg-white text-slate-600'}`}>{l}</button>)}</div>
    </main>

    {type==='people'?<main className="mx-auto max-w-3xl px-4 pb-28 pt-5 md:pb-10">
      <section className="rounded-3xl border bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-3 rounded-2xl border bg-slate-50 px-4 py-3"><Search size={19} className="text-slate-400"/><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Find by username or name..." className="min-w-0 flex-1 bg-transparent outline-none"/></div>
        <p className="mt-2 text-xs font-semibold text-slate-400">Type a username like <b>@baskar1892</b> or search by name.</p>
        {error&&<p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        <div className="mt-4 divide-y">
          {loading&&<div className="space-y-2 py-2">{[1,2,3].map(x=><div key={x} className="h-16 animate-pulse rounded-2xl bg-slate-100"/>)}</div>}
          {!loading&&people.map(user=><Link key={user.id} to={`/profile/${user.id}`} className="flex items-center gap-3 py-3 transition hover:bg-slate-50 sm:px-2">
            <UserAvatar user={user} sizeClass="h-12 w-12" iconSize={22}/>
            <div className="min-w-0 flex-1"><p className="truncate font-black text-slate-900">{user.name}</p>{user.username&&<p className="mt-0.5 flex items-center gap-1 truncate text-xs font-bold text-blue-600"><AtSign size={12}/>{user.username}</p>}<p className="truncate text-xs text-slate-400">{user.village||'Namma Madurandhagam'}</p></div>
            {user.isPrivate?<Lock size={17} className="text-slate-400"/>:<UserRound size={17} className="text-slate-300"/>}
          </Link>)}
          {!loading&&q.trim().length>=2&&!people.length&&!error&&<div className="py-12 text-center text-sm font-semibold text-slate-400">No users found.</div>}
          {!loading&&q.trim().length<2&&<div className="py-12 text-center text-sm font-semibold text-slate-400">Enter at least 2 characters to find users.</div>}
        </div>
      </section>
    </main>:<ListingPage type={type} title={options.find(x=>x[0]===type)?.[1]||'Explore'} subtitle="Search and discover local listings."/>}
  </div>;
}
