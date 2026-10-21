import { ArrowRight, Percent, Search, Store } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { getUserToken } from '../lib/session';
import ContentCard from '../components/ContentCard';
import EmptyState from '../components/EmptyState';
import MediaCarousel, { getMediaItems } from '../components/MediaCarousel';
import UserAvatar from '../components/UserAvatar';

const toAmount = (value) => {
  if (value == null || value === '') return null;
  const amount = Number(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(amount) ? amount : null;
};
const money = (value) => value == null ? '' : `₹${Number(value).toLocaleString('en-IN')}`;

function offerInfo(item) {
  const originalPrice = toAmount(item.meta?.originalPrice);
  const offerPrice = toAmount(item.meta?.offerPrice ?? item.price);
  const discount = originalPrice && offerPrice != null && originalPrice > offerPrice ? Math.round(((originalPrice - offerPrice) / originalPrice) * 100) : null;
  const shopName = item.meta?.advertiserName || item.meta?.businessName || item.meta?.companyName || item.author?.name || 'Local Business';
  return { originalPrice, offerPrice, discount, shopName };
}

function OfferCard({ item }) {
  const { originalPrice, offerPrice, discount, shopName } = offerInfo(item);
  const shopUser = { ...(item.author || {}), name: shopName, profilePhotoUrl: item.meta?.shopLogoUrl || item.author?.profilePhotoUrl };
  const mediaItems=getMediaItems(item);

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-center gap-3 px-4 pb-2 pt-4">
        <UserAvatar user={shopUser} sizeClass="h-11 w-11" iconSize={20} />
        <div className="min-w-0 flex-1"><p className="truncate font-black text-slate-900">{shopName}</p><p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-400"><Store size={12}/> Local offer</p></div>
        {discount != null && <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-600"><Percent size={13}/> {discount}% OFF</span>}
      </div>

      {mediaItems.length ? <MediaCarousel item={item} linkTo={`/offer/${item._id}`} maxHeightClass="max-h-[65vh]"/> : <Link to={`/offer/${item._id}`} className="grid h-32 place-items-center bg-gradient-to-br from-blue-700 to-sky-400 text-4xl font-black text-white">OFFER</Link>}

      <div className="p-4">
        <Link to={`/offer/${item._id}`} className="block text-lg font-black leading-snug text-slate-900 hover:text-blue-700">{item.title}</Link>
        {item.description && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{item.description}</p>}
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-baseline gap-2">{originalPrice != null && originalPrice !== offerPrice && <span className="text-sm font-bold text-slate-400 line-through">{money(originalPrice)}</span>}{offerPrice != null && <span className="text-2xl font-black text-blue-700">{money(offerPrice)}</span>}</div>
          <Link to={`/offer/${item._id}`} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm">View Offer <ArrowRight size={17}/></Link>
        </div>
      </div>
    </article>
  );
}

export default function ListingPage({type,title,subtitle}){
  const [items,setItems]=useState([]),[query,setQuery]=useState(''),[loading,setLoading]=useState(true);
  const token=getUserToken();
  const isPostFeed=type==='post';

  useEffect(()=>{setLoading(true);api(`/content?type=${type}`,{token}).then(setItems).catch(()=>setItems([])).finally(()=>setLoading(false))},[type,token]);
  const filtered=useMemo(()=>items.filter(x=>`${x.title||''} ${x.description||''} ${x.area||''} ${x.meta?.advertiserName||''} ${x.meta?.businessName||''}`.toLowerCase().includes(query.toLowerCase())),[items,query]);

  return <main className={isPostFeed?'mx-auto max-w-6xl pb-24 pt-6 md:pb-10':'mx-auto max-w-6xl px-4 pb-24 pt-6 md:pb-10'}>
    <div className={`${isPostFeed?'mx-4 md:mx-0 ':''}rounded-[28px] bg-gradient-to-r from-blue-700 to-sky-500 p-6 text-white`}><p className="text-xs font-extrabold tracking-[.18em] text-blue-100">NAMMA MADURANDHAGAM</p><h1 className="mt-1 text-3xl font-black">{title}</h1><p className="mt-2 text-sm text-blue-50">{subtitle}</p></div>
    <div className={`${isPostFeed?'mx-4 md:mx-0 ':''}mt-5 flex items-center gap-2 rounded-2xl border bg-white px-4 py-3 shadow-sm`}><Search size={19} className="text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} className="w-full outline-none" placeholder={`Search ${title.toLowerCase()}...`}/></div>
    <div className="mt-5">
      {loading ? (
        isPostFeed ? <div className="space-y-1 bg-white md:mx-auto md:max-w-2xl">{[1,2,3].map(i=><div key={i} className="h-80 animate-pulse border-y bg-white"/>)}</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i=><div key={i} className="h-64 animate-pulse rounded-3xl bg-white"/>)}</div>
      ) : filtered.length ? (
        isPostFeed ? <div className="bg-white md:mx-auto md:max-w-2xl">{filtered.map(x=><ContentCard key={x._id} item={x}/>)}</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(x=>type==='offer'?<OfferCard key={x._id} item={x}/>:<ContentCard key={x._id} item={x}/>)}</div>
      ) : <div className={isPostFeed?'px-4 md:px-0':''}><EmptyState title={`No ${title.toLowerCase()} yet`}/></div>}
    </div>
  </main>
}
