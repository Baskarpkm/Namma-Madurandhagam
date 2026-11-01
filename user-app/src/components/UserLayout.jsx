import { Outlet } from 'react-router-dom';
import AppHeader from './AppHeader';
import BannerCleaner from './BannerCleaner';
import BottomNav from './BottomNav';
import SiteFooter from './SiteFooter';

export default function UserLayout() {
  return (
    <div className="min-h-screen bg-[#f6f9ff]">
      <AppHeader />
      <BannerCleaner />
      <Outlet />
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
