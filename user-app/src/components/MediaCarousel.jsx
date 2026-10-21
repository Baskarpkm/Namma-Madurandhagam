import { ChevronLeft, ChevronRight, PlayCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export function getMediaItems(item) {
  const raw = Array.isArray(item?.meta?.mediaItems) ? item.meta.mediaItems : [];
  const normalized = raw
    .map(entry => ({
      url: String(entry?.url || entry?.mediaUrl || '').trim(),
      publicId: String(entry?.publicId || entry?.mediaPublicId || '').trim(),
      type: entry?.type === 'video' || entry?.mediaType === 'video' ? 'video' : 'image',
    }))
    .filter(entry => entry.url);

  if (normalized.length) return normalized;
  if (!item?.mediaUrl) return [];
  return [{
    url: item.mediaUrl,
    publicId: item.mediaPublicId || '',
    type: item.mediaType === 'video' ? 'video' : 'image',
  }];
}

export default function MediaCarousel({
  item,
  linkTo = '',
  controls = false,
  autoPlay = false,
  showArrows = false,
  playOverlay = true,
  maxHeightClass = 'max-h-[70vh]',
  rounded = false,
}) {
  const items = useMemo(() => getMediaItems(item), [item]);
  const scroller = useRef(null);
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);

  const goTo = (next, behavior = 'smooth') => {
    if (!items.length) return;
    const bounded = (next + items.length) % items.length;
    const el = scroller.current;
    const child = el?.children?.[bounded];
    if (el && child) el.scrollTo({ left: child.offsetLeft, behavior });
    indexRef.current = bounded;
    setIndex(bounded);
  };

  const syncIndex = () => {
    const el = scroller.current;
    if (!el || !items.length) return;
    const positions = Array.from(el.children).map((child, i) => ({
      i,
      d: Math.abs(el.scrollLeft - child.offsetLeft),
    }));
    positions.sort((a, b) => a.d - b.d);
    const next = positions[0]?.i || 0;
    indexRef.current = next;
    setIndex(next);
  };

  useEffect(() => {
    indexRef.current = 0;
    setIndex(0);
    scroller.current?.scrollTo({ left: 0, behavior: 'auto' });
  }, [item?._id, items.length]);

  useEffect(() => {
    if (!autoPlay || items.length < 2) return undefined;
    const timer = setInterval(() => goTo(indexRef.current + 1), 4500);
    return () => clearInterval(timer);
  }, [autoPlay, items.length]);

  if (!items.length) return null;

  const slide = (media, i) => {
    const body = media.type === 'video' ? (
      <div className="relative flex w-full items-center justify-center bg-black">
        <video
          src={media.url}
          controls={controls}
          muted={!controls}
          playsInline
          preload="metadata"
          className={`block w-full object-contain ${maxHeightClass}`}
        />
        {!controls && playOverlay && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/10 text-white">
            <PlayCircle size={42} />
          </span>
        )}
      </div>
    ) : (
      <div className="flex w-full items-center justify-center bg-slate-100">
        <img
          src={media.url}
          alt={item?.title || `Media ${i + 1}`}
          loading={i === 0 ? 'eager' : 'lazy'}
          className={`block h-auto w-full object-contain ${maxHeightClass}`}
        />
      </div>
    );

    return (
      <div key={`${media.url}-${i}`} className="min-w-full snap-center">
        {linkTo ? <Link to={linkTo} className="block w-full">{body}</Link> : body}
      </div>
    );
  };

  return (
    <div className={`relative overflow-hidden bg-slate-100 ${rounded ? 'rounded-3xl' : ''}`}>
      <div
        ref={scroller}
        onScroll={syncIndex}
        className="flex w-full snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map(slide)}
      </div>

      {items.length > 1 && (
        <>
          <span className="pointer-events-none absolute right-3 top-3 z-20 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-black text-white backdrop-blur">
            {index + 1}/{items.length}
          </span>
          <div className="pointer-events-none absolute inset-x-0 bottom-2 z-20 flex justify-center gap-1.5">
            {items.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full shadow ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/60'}`} />
            ))}
          </div>
        </>
      )}

      {showArrows && items.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); goTo(indexRef.current - 1); }}
            className="absolute left-2 top-1/2 z-30 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur"
            aria-label="Previous photo"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); goTo(indexRef.current + 1); }}
            className="absolute right-2 top-1/2 z-30 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur"
            aria-label="Next photo"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}
    </div>
  );
}
