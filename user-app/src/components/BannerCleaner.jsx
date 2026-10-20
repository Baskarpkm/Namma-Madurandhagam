import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { getUserToken } from '../lib/session';

export default function BannerCleaner() {
  const location = useLocation();
  const token = getUserToken();
  const isHome = location.pathname === '/';

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('nm-home-banner-clean', isHome);
    return () => document.documentElement.classList.remove('nm-home-banner-clean');
  }, [isHome]);

  useEffect(() => {
    if (!isHome) return undefined;

    let cancelled = false;
    let observer;
    const cleanups = [];

    const wire = (banners) => {
      if (cancelled) return false;
      const cards = Array.from(
        document.querySelectorAll('main > section:nth-of-type(2) article.relative.min-w-full.snap-center')
      );
      if (!cards.length) return false;

      cards.forEach((card, index) => {
        const banner = banners[index];
        const link = String(banner?.linkUrl || '').trim();
        if (!link || card.dataset.nmBannerWired === '1') return;

        card.dataset.nmBannerWired = '1';
        card.setAttribute('role', 'link');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', banner?.title ? `Open ${banner.title}` : 'Open banner link');
        card.style.cursor = 'pointer';

        const open = () => window.location.assign(link);
        const key = (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            open();
          }
        };

        card.addEventListener('click', open);
        card.addEventListener('keydown', key);
        cleanups.push(() => {
          card.removeEventListener('click', open);
          card.removeEventListener('keydown', key);
        });
      });

      return true;
    };

    api('/content?type=banner', { token })
      .then((banners) => {
        if (cancelled) return;
        if (!wire(Array.isArray(banners) ? banners : [])) {
          observer = new MutationObserver(() => {
            if (wire(Array.isArray(banners) ? banners : [])) observer?.disconnect();
          });
          observer.observe(document.body, { childList: true, subtree: true });
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      observer?.disconnect();
      cleanups.forEach((fn) => fn());
    };
  }, [isHome, token]);

  return null;
}
