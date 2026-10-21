import { ArrowLeft, CalendarDays, Check, Copy, MapPin, Navigation, Percent, Store, Tag } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { getUserToken } from '../lib/session';
import UserAvatar from '../components/UserAvatar';

const toAmount = (value) => {
  if (value == null || value === '') return null;
  const amount = Number(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(amount) ? amount : null;
};
const money = (value) => value == null ? '' : `₹${Number(value).toLocaleString('en-IN')}`;

function shopName(item) {
  return item?.meta?.advertiserName ||
    item?.meta?.businessName ||
    item?.meta?.companyName ||
    item?.author?.name ||
    'Local Business';
}

export default function OfferDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const token = getUserToken();
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api(`/content/public/${id}`, { token })
      .then(data => {
        if (data.type !== 'offer') {
          nav(`/view/${id}`, { replace: true });
          return;
        }
        setItem(data);
      })
      .catch(e => setError(e.message));
  }, [id]);

  const info = useMemo(() => {
    if (!item) return {};
    const originalPrice = toAmount(item.meta?.originalPrice);
    const offerPrice = toAmount(item.meta?.offerPrice ?? item.price);
    const discount = originalPrice && offerPrice != null && originalPrice > offerPrice
      ? Math.round(((originalPrice - offerPrice) / originalPrice) * 100)
      : null;
    const code = item.meta?.offerCode || '';
    const validUntil = item.meta?.validUntil || item.endsAt || item.expiresAt || '';
    const address = item.meta?.address || item.area || '';
    return { originalPrice, offerPrice, discount, code, validUntil, address };
  }, [item]);

  const copyCode = async (message = 'Offer code copied.') => {
    if (!info.code) {
      setNotice('No offer code is required for this offer.');
      return;
    }
    try {
      await navigator.clipboard.writeText(info.code);
      setNotice(message);
    } catch {
      setNotice(`Offer code: ${info.code}`);
    }
  };

  const directionsUrl = info.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(info.address)}`
    : null;

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-3xl border bg-white p-8 text-center">
          <p className="font-bold text-red-600">{error}</p>
          <button onClick={() => nav(-1)} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 font-bold text-white">Go Back</button>
        </div>
      </main>
    );
  }

  if (!item) return <main className="mx-auto max-w-3xl px-4 py-10"><div className="h-96 animate-pulse rounded-3xl bg-white"/></main>;

  const business = shopName(item);
  const shopUser = {
    ...(item.author || {}),
    name: business,
    profilePhotoUrl: item.meta?.shopLogoUrl || item.author?.profilePhotoUrl,
  };

  return (
    <main className="mx-auto max-w-3xl px-0 pb-28 pt-0 sm:px-4 sm:pt-6 md:pb-10">
      <button onClick={() => nav('/offers')} className="m-4 flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-bold text-slate-600 sm:mx-0 sm:mt-0">
        <ArrowLeft size={17}/> Back to Offers
      </button>

      <article className="overflow-hidden border-y bg-white shadow-sm sm:rounded-[30px] sm:border">
        <div className="relative bg-gradient-to-br from-blue-800 to-sky-500">
          {item.mediaUrl ? (
            item.mediaType === 'video' ? (
              <video src={item.mediaUrl} controls playsInline className="max-h-[520px] w-full bg-black object-contain"/>
            ) : (
              <img src={item.mediaUrl} alt={item.title || ''} className="max-h-[520px] w-full object-contain"/>
            )
          ) : (
            <div className="grid h-56 place-items-center px-6 text-center text-5xl font-black text-white/90">SPECIAL OFFER</div>
          )}
          {info.discount != null && (
            <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-rose-500 px-3 py-2 text-sm font-black text-white shadow-lg">
              <Percent size={16}/> {info.discount}% OFF
            </span>
          )}
        </div>

        <div className="p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <UserAvatar user={shopUser} sizeClass="h-12 w-12" iconSize={23}/>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-black text-slate-900">{business}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs font-bold text-slate-400">
                <Store size={13}/> {item.meta?.businessCategory || 'Local business'}
              </p>
            </div>
          </div>

          <h1 className="mt-5 text-3xl font-black leading-tight text-slate-950">{item.title}</h1>
          {item.description && <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-slate-600">{item.description}</p>}

          {(info.originalPrice != null || info.offerPrice != null) && (
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 p-4">
              {info.originalPrice != null && info.originalPrice !== info.offerPrice && (
                <span className="text-lg font-bold text-slate-400 line-through">{money(info.originalPrice)}</span>
              )}
              {info.offerPrice != null && <span className="text-3xl font-black text-blue-700">{money(info.offerPrice)}</span>}
              {info.discount != null && <span className="ml-auto rounded-full bg-rose-50 px-3 py-1.5 text-sm font-black text-rose-600">{info.discount}% OFF</span>}
            </div>
          )}

          <section className="mt-5 rounded-2xl border border-dashed border-blue-300 bg-blue-50/60 p-4">
            <p className="text-[11px] font-black uppercase tracking-[.16em] text-blue-500">Offer Code</p>
            <div className="mt-2 flex items-center gap-3">
              <p className="min-w-0 flex-1 truncate text-2xl font-black tracking-wide text-slate-900">{info.code || 'No code required'}</p>
              {info.code && (
                <button onClick={() => copyCode()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white">
                  <Copy size={17}/> Copy Code
                </button>
              )}
            </div>
          </section>

          <div className="mt-5 space-y-3">
            {info.validUntil && (
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-blue-600 shadow-sm"><CalendarDays size={20}/></span>
                <div><p className="text-xs font-bold text-slate-400">Valid Till</p><p className="font-black text-slate-800">{new Date(info.validUntil).toLocaleDateString('en-IN', {dateStyle:'medium'})}</p></div>
              </div>
            )}
            {info.address && (
              <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-blue-600 shadow-sm"><MapPin size={20}/></span>
                <div className="min-w-0"><p className="text-xs font-bold text-slate-400">Shop Location</p><p className="mt-1 font-bold leading-6 text-slate-800">{info.address}</p></div>
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {directionsUrl ? (
              <a href={directionsUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-2xl border-2 border-blue-600 px-4 py-3 font-extrabold text-blue-700">
                <Navigation size={19}/> Get Direction
              </a>
            ) : (
              <button disabled className="flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 font-extrabold text-slate-400">
                <Navigation size={19}/> Get Direction
              </button>
            )}
            <button onClick={() => copyCode(info.code ? 'Offer code copied. Show it at the store to redeem.' : 'Show this offer at the store to redeem.')} className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-extrabold text-white">
              <Store size={19}/> Redeem in Store
            </button>
          </div>

          {notice && (
            <p className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              <Check size={18}/> {notice}
            </p>
          )}

          <div className="mt-6 border-t pt-5">
            <p className="flex items-center gap-2 font-black text-slate-900"><Tag size={17} className="text-blue-600"/> Offer Details</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">Show this offer and the offer code, when available, at the business before payment. Availability and final redemption are confirmed by the shop.</p>
          </div>
        </div>
      </article>
    </main>
  );
}
