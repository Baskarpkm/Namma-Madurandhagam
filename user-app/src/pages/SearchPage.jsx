import { Search } from 'lucide-react';
import { useState } from 'react';
import ListingPage from './ListingPage';
const options=[['shop','Shops'],['worker','Workers'],['job','Jobs'],['vehicle','Vehicles'],['service','Services'],['event','Events'],['offer','Offers'],['post','Updates']];
export default function SearchPage(){const [type,setType]=useState('shop');return <div><main className="mx-auto max-w-6xl px-4 pt-5"><div className="flex gap-2 overflow-x-auto pb-1">{options.map(([v,l])=><button onClick={()=>setType(v)} key={v} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${type===v?'bg-blue-600 text-white':'border bg-white text-slate-600'}`}>{l}</button>)}</div></main><ListingPage type={type} title={options.find(x=>x[0]===type)?.[1]||'Explore'} subtitle="Search and discover local listings."/></div>}
