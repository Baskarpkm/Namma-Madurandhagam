import { ArrowRight, Heart, MapPin, MessageCircle, Share2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { getUserToken } from '../lib/session';
import MediaCarousel, { getMediaItems } from './MediaCarousel';
import UserAvatar from './UserAvatar';

export default function ContentCard({ item, compact = false }) {
  const isPost = item.type === 'post';
  const detailPath = item.type === 'offer' ? `/offer/${item._id}` : `/view/${item._id}`;
  const token = getUserToken();
  const mediaItems = getMediaItems(item);
  const typeLabel = item.type === 'shop' ? 'Business / Shop' : isPost ? 'Post' : item.type;
  const [liked, setLiked] = useState(Boolean(item.likedByMe));
  const [likeCount, setLikeCount] = useState(Number(item.likeCount || 0));
  const [shareCount, setShareCount] = useState(Number(item.shareCount || 0));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const toggleLike = async () => {
    if (!isPost || busy) return;
    setBusy(true);
    setNotice('');
    try {
      const data = await api(`/content/public/${item._id}/like`, { token, method: 'POST' });
      setLiked(Boolean(data.liked));
      setLikeCount(Number(data.likeCount || 0));
    } catch (e) {
      setNotice(e.message || 'Unable to like post');
    } finally {
      setBusy(false);
    }
  };

  const sharePost = async () => {
    if (!isPost || busy) return;
    const url = `${window.location.origin}/view/${item._id}`;
    setBusy(true);
    setNotice('');
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title || 'Namma Madurandhagam', text: item.description || '', url });
      } else {
        await navigator.clipboard.writeText(url);
        setNotice('Post link copied');
      }
      const data = await api(`/content/public/${item._id}/share`, { token, method: 'POST' });
      setShareCount(Number(data.shareCount || 0));
    } catch (e) {
      if (e?.name !== 'AbortError') setNotice(e.message || 'Unable to share post');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={isPost ? "group overflow-hidden border-y border-slate-200 bg-white" : "group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"}>
      <header className="flex items-center gap-3 p-4 pb-3">
        <UserAvatar user={item.author} sizeClass="h-10 w-10" iconSize={19} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-slate-900">{item.author?.name || 'Namma Madurandhagam'}</p>
          <p className="flex items-center gap-1 truncate text-[11px] font-semibold text-slate-400">
            {item.area && <><MapPin size={11} />{item.area}<span>•</span></>}
            <span className="uppercase">{typeLabel}</span>
          </p>
        </div>
      </header>

      {mediaItems.length ? (
        <MediaCarousel item={item} linkTo={detailPath} controls={false} playOverlay maxHeightClass={compact?'max-h-[55vh]':'max-h-[70vh]'}/>
      ) : (
        <Link to={detailPath} className={`${compact ? 'h-24' : 'h-32'} grid place-items-center bg-gradient-to-br from-blue-600 to-sky-400 text-4xl font-black text-white/90`}>NM</Link>
      )}

      <div className="p-4">
        <Link to={detailPath} className="block text-lg font-black leading-snug text-slate-900 hover:text-blue-700">{item.title}</Link>
        {item.description && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{item.description}</p>}
        {item.price != null && item.price !== '' && <p className="mt-3 text-lg font-black text-blue-700">₹{Number(item.price).toLocaleString('en-IN')}</p>}

        {isPost ? (
          <div className="mt-4 border-t pt-3">
            <div className="flex items-center gap-1">
              <button type="button" disabled={busy} onClick={toggleLike} className={`flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-extrabold transition ${liked ? 'text-rose-600' : 'text-slate-600 hover:bg-slate-100'}`}>
                <Heart size={18} fill={liked ? 'currentColor' : 'none'} /><span>{likeCount}</span>
              </button>
              <Link to={detailPath} className="flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-extrabold text-slate-600 hover:bg-slate-100"><MessageCircle size={18}/><span>{item.commentCount || 0}</span></Link>
              <button type="button" disabled={busy} onClick={sharePost} className="flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-extrabold text-slate-600 hover:bg-slate-100"><Share2 size={18}/><span>{shareCount}</span></button>
              <Link to={detailPath} className="ml-auto text-xs font-extrabold text-blue-600">View</Link>
            </div>
            {notice && <p className="mt-2 text-[11px] font-bold text-blue-600">{notice}</p>}
          </div>
        ) : (
          <Link to={detailPath} className="mt-4 flex items-center justify-between border-t pt-3 text-sm font-extrabold text-blue-600">
            <span>{item.type === 'offer' ? 'View offer' : item.mediaType === 'video' ? 'Watch & view details' : 'View details'}</span><ArrowRight size={17}/>
          </Link>
        )}
      </div>
    </article>
  );
}
