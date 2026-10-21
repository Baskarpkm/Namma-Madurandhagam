import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import UserLayout from './components/UserLayout';
import HomeEntry from './components/HomeEntry';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import WelcomePage from './pages/WelcomePage';
import ListingPage from './pages/ListingPage';
import SearchPage from './pages/SearchPage';
import NotificationsPage from './pages/NotificationsPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import PostEntryPage from './pages/PostEntryPage';
import MySubmissionsPage from './pages/MySubmissionsPage';
import MyPostsPage from './pages/MyPostsPage';
import MockPaymentPage from './pages/MockPaymentPage';
import ContentDetailPage from './pages/ContentDetailPage';
import OfferDetailPage from './pages/OfferDetailPage';
import StoryViewPage from './pages/StoryViewPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/story/:id" element={<StoryViewPage />} />
        <Route element={<UserLayout />}>
          <Route path="/" element={<HomeEntry />} />
          <Route path="/post" element={<PostEntryPage />} />
          <Route path="/mock-payment/:contentId" element={<MockPaymentPage />} />
          <Route path="/my-submissions" element={<MySubmissionsPage />} />
          <Route path="/my-posts" element={<MyPostsPage />} />
          <Route path="/view/:id" element={<ContentDetailPage />} />
          <Route path="/offer/:id" element={<OfferDetailPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/shops" element={<ListingPage type="shop" title="Business / Shops" subtitle="Discover local businesses and shops around Madurandhagam." />} />
          <Route path="/workers" element={<ListingPage type="worker" title="Workers" subtitle="Find local skilled workers and service professionals." />} />
          <Route path="/jobs" element={<ListingPage type="job" title="Jobs" subtitle="Local jobs and opportunities." />} />
          <Route path="/vehicles" element={<ListingPage type="vehicle" title="Vehicles" subtitle="Local vehicle listings." />} />
          <Route path="/events" element={<ListingPage type="event" title="Events" subtitle="Community events and programmes." />} />
          <Route path="/services" element={<ListingPage type="service" title="Services" subtitle="Useful local services in one place." />} />
          <Route path="/offers" element={<ListingPage type="offer" title="Offers" subtitle="Current local offers and promotions." />} />
          <Route path="/updates" element={<ListingPage type="post" title="Posts & Updates" subtitle="News, videos and updates from around Madurandhagam." />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
