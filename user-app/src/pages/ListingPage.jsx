import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { getUserToken } from '../lib/session';
import ContentCard from '../components/ContentCard';
import EmptyState from '../components/EmptyState';
export default function ListingPage({type,title,subtitle}){
  const [items,setItems]=useState([]); const [query,setQuery]=useState(''); const [loading,setLoading]=useState(true); const token=getUserToken();
  useEffect(()=>{setLoading(true);api(`/content?type=${type}`,{token}).then(setItems).catch(()=>setItems([])).finally(()=>setLoading(false))},[type]);
  const filtered=useMemo(()=>items.filter(x=>`${x.title||''} ${x.description||''} ${x.area||''}`.toLowerCase().includes(query.toLowerCase())),[items,query]);
  return <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 md:pb-10"><div className="rounded-[28px] bg-gradient-to-r from-blue-700 to-sky-500 p-6 text-white"><p className="text-xs font-extrabold tracking-[.18em] text-blue-100">NAMMA MADURANDHAGAM</p><h1 className="mt-1 text-3xl font-black">{title}</h1><p className="mt-2 text-sm text-blue-50">{subtitle}</p></div><div className="mt-5 flex items-center gap-2 rounded-2xl border bg-white px-4 py-3 shadow-sm"><Search size={19} className="text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} className="w-full outline-none" placeholder={`Search ${title.toLowerCase()}...`}/></div><div className="mt-5">{loading?<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i=><div key={i} className="h-64 animate-pulse rounded-3xl bg-white"/>)}</div>:filtered.length?<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(x=><ContentCard key={x._id} item={x}/>)}</div>:<EmptyState title={`No ${title.toLowerCase()} yet`}/>}</div></main>
}
