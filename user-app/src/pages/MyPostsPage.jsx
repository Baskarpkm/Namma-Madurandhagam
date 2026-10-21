import { Film, Heart, Image, MessageCircle, PlayCircle, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { getUserToken } from '../lib/session';
import { getMediaItems } from '../components/MediaCarousel';

const when = (date) => date ? new Date(date).toLocaleString('en-IN', {dateStyle:'medium', timeStyle:'short'}) : '';

export default function MyPostsPage() {
  const token = getUserToken();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true); setError('');
    api('/content/user/mine', { token })
      .then(data => setItems((data || []).filter(x => x.type === 'post' && x.status === 'approved' && getMediaItems(x).length)))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter(item => {
    const media=getMediaItems(item);
    const hasVideo=media.some(x=>x.type==='video');
    if (filter === 'photo') return !hasVideo;
    if (filter === 'video') return hasVideo;
    return true;
  }), [items, filter]);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-28 pt-6 md:pb-10">
      <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black tracking-[.16em] text-blue-600">PROFILE</p><h1 className="mt-1 text-3xl font-black text-slate-950">My Posts</h1><p className="mt-1 text-sm text-slate-500">Your approved photo and video posts, shown separately from submission status tracking.</p></div><button onClick={load} className="rounded-xl border bg-white p-2.5"><RefreshCw size={18}/></button></div>

      <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1.5"><FilterButton active={filter === 'all'} onClick={() => setFilter('all')} label="All"/><FilterButton active={filter === 'photo'} onClick={() => setFilter('photo')} label="Photos" icon={<Image size={15}/>}/><FilterButton active={filter === 'video'} onClick={() => setFilter('video')} label="Videos" icon={<Film size={15}/>}/></div>

      {error && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}

      <div className="mt-5 space-y-3">
        {loading ? [1,2,3].map(i => <div key={i} className="h-36 animate-pulse rounded-3xl bg-white"/>) : filtered.map(item => {
          const media=getMediaItems(item);const first=media[0];const hasVideo=first?.type==='video';
          return <Link key={item._id} to={`/view/${item._id}`} className="group flex overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="relative flex w-36 shrink-0 items-center justify-center bg-slate-100 sm:w-44">
              {hasVideo ? <><video src={first.url} muted playsInline preload="metadata" className="max-h-44 w-full bg-black object-contain"/><span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/10 text-white"><PlayCircle size={40}/></span></> : <img src={first.url} alt={item.title || ''} className="max-h-44 w-full object-contain"/>}
              {media.length>1&&<span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] font-black text-white">1/{media.length}</span>}
            </div>
            <div className="min-w-0 flex-1 p-4">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-blue-600">{hasVideo ? <Film size={13}/> : <Image size={13}/>} {hasVideo ? 'Video' : media.length>1?`${media.length} Photos`:'Photo'}</div>
              <h2 className="mt-2 text-base font-black leading-5 text-slate-900 group-hover:text-blue-700">{item.title}</h2>
              {item.description && <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-slate-500">{item.description}</p>}
              <p className="mt-2 text-[11px] font-semibold text-slate-400">{when(item.publishedAt || item.createdAt)}</p>
              <div className="mt-3 flex items-center gap-4 text-xs font-extrabold text-slate-500"><span className="flex items-center gap-1"><Heart size={15}/>{item.likeCount || 0}</span><span className="flex items-center gap-1"><MessageCircle size={15}/>{item.commentCount || 0}</span></div>
            </div>
          </Link>
        })}

        {!loading && !filtered.length && <div className="rounded-3xl border bg-white p-10 text-center"><p className="font-black text-slate-700">No {filter === 'all' ? '' : filter} posts yet.</p><p className="mt-1 text-sm text-slate-400">Approved photo/video posts will appear here. Pending and payment status remain under My Submissions.</p></div>}
      </div>
    </main>
  );
}

function FilterButton({active, onClick, label, icon}) {
  return <button onClick={onClick} className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-extrabold transition ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white'}`}>{icon}{label}</button>
}
