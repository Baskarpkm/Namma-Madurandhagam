import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import UserLayout from './components/UserLayout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ListingPage from './pages/ListingPage';
import SearchPage from './pages/SearchPage';
import NotificationsPage from './pages/NotificationsPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import PostPage from './pages/PostPage';
import MySubmissionsPage from './pages/MySubmissionsPage';
import MockPaymentPage from './pages/MockPaymentPage';
import ContentDetailPage from './pages/ContentDetailPage';
import StoryViewPage from './pages/StoryViewPage';

export default function App(){return <Routes>
  <Route path="/login" element={<LoginPage/>}/>
  <Route element={<ProtectedRoute/>}>
    <Route path="/story/:id" element={<StoryViewPage/>}/>
    <Route element={<UserLayout/>}>
      <Route path="/" element={<HomePage/>}/>
      <Route path="/post" element={<PostPage/>}/>
      <Route path="/mock-payment/:contentId" element={<MockPaymentPage/>}/>
      <Route path="/my-submissions" element={<MySubmissionsPage/>}/>
      <Route path="/view/:id" element={<ContentDetailPage/>}/>
      <Route path="/search" element={<SearchPage/>}/>
      <Route path="/shops" element={<ListingPage type="shop" title="Businesses" subtitle="Discover local shops and businesses around Madurandhagam."/>}/>
      <Route path="/workers" element={<ListingPage type="worker" title="Workers" subtitle="Find local skilled workers and service professionals."/>}/>
      <Route path="/jobs" element={<ListingPage type="job" title="Jobs" subtitle="Local jobs and opportunities."/>}/>
      <Route path="/vehicles" element={<ListingPage type="vehicle" title="Vehicles" subtitle="Local vehicle listings."/>}/>
      <Route path="/events" element={<ListingPage type="event" title="Events" subtitle="Community events and programmes."/>}/>
      <Route path="/services" element={<ListingPage type="service" title="Services" subtitle="Useful local services in one place."/>}/>
      <Route path="/offers" element={<ListingPage type="offer" title="Offers" subtitle="Current local offers and promotions."/>}/>
      <Route path="/updates" element={<ListingPage type="post" title="Posts & Updates" subtitle="News, videos and updates from around Madurandhagam."/>}/>
      <Route path="/notifications" element={<NotificationsPage/>}/>
      <Route path="/chat" element={<ChatPage/>}/>
      <Route path="/profile" element={<ProfilePage/>}/>
    </Route>
  </Route>
  <Route path="*" element={<Navigate to="/" replace/>}/>
</Routes>}
