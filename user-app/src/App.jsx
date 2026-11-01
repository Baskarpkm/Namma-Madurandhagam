import { useCallback, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import UserLayout from './components/UserLayout';
import HomeEntry from './components/HomeEntry';
import GlobalRefreshFix from './components/GlobalRefreshFix';
import StoryViewportLock from './components/StoryViewportLock';
import LiveAutoSync from './components/LiveAutoSync';
import MobileBackHider from './components/MobileBackHider';
import PresenceHeartbeat from './components/PresenceHeartbeat';
import AccountStatusGate from './components/AccountStatusGate';
import RouteScrollManager from './components/RouteScrollManager';
import SiteFooter from './components/SiteFooter';
import CallIncomingWatcher from './components/CallIncomingWatcher';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import WelcomePage from './pages/WelcomePage';
import ListingPage from './pages/ListingPage';
import SearchPage from './pages/SearchPage';
import NotificationsPage from './pages/NotificationsPage';
import ChatPage from './pages/ChatPage';
import ChatConversationPage from './pages/ChatConversationPage';
import ProfilePage from './pages/ProfilePage';
import PublicProfilePage from './pages/PublicProfilePage';
import FollowListPage from './pages/FollowListPage';
import FollowRequestsPage from './pages/FollowRequestsPage';
import PostEntryPage from './pages/PostEntryPage';
import MySubmissionsPage from './pages/MySubmissionsPage';
import MyPostsPage from './pages/MyPostsPage';
import MockPaymentPage from './pages/MockPaymentPage';
import ContentDetailPage from './pages/ContentDetailPage';
import OfferDetailPage from './pages/OfferDetailPage';
import StoryViewPage from './pages/StoryViewPage';
import CallPage from './pages/CallPage';
import CallHistoryPage from './pages/CallHistoryPage';
import { ContactUsPage, PricingServicesPage, PrivacyPolicyPage, RefundCancellationPage, ShippingDeliveryPage, TermsConditionsPage } from './pages/CompliancePages';

function PublicFooterPage({children}){return <div className="min-h-screen bg-[#f6f9ff]"><div>{children}</div><SiteFooter/></div>}

export default function App(){
  const [syncKey,setSyncKey]=useState(0);const softSync=useCallback(()=>setSyncKey(x=>x+1),[]);
  return <>
    <GlobalRefreshFix/><RouteScrollManager/><MobileBackHider/><LiveAutoSync onSync={softSync}/><PresenceHeartbeat/><AccountStatusGate/><CallIncomingWatcher/>
    <Routes key={syncKey}>
      <Route path="/login" element={<PublicFooterPage><LoginPage/></PublicFooterPage>}/>
      <Route path="/register" element={<PublicFooterPage><RegisterPage/></PublicFooterPage>}/>
      <Route path="/terms-and-conditions" element={<PublicFooterPage><TermsConditionsPage/></PublicFooterPage>}/>
      <Route path="/privacy-policy" element={<PublicFooterPage><PrivacyPolicyPage/></PublicFooterPage>}/>
      <Route path="/refund-cancellation" element={<PublicFooterPage><RefundCancellationPage/></PublicFooterPage>}/>
      <Route path="/pricing-services" element={<PublicFooterPage><PricingServicesPage/></PublicFooterPage>}/>
      <Route path="/shipping-delivery" element={<PublicFooterPage><ShippingDeliveryPage/></PublicFooterPage>}/>
      <Route path="/contact-us" element={<PublicFooterPage><ContactUsPage/></PublicFooterPage>}/>
      <Route element={<ProtectedRoute/>}>
        <Route path="/welcome" element={<WelcomePage/>}/>
        <Route path="/story/:id" element={<StoryViewportLock><StoryViewPage/></StoryViewportLock>}/>
        <Route path="/chat/:peerId" element={<ChatConversationPage/>}/>
        <Route path="/call/start/:targetId" element={<CallPage/>}/>
        <Route path="/call/:callId" element={<CallPage/>}/>
        <Route element={<UserLayout/>}>
          <Route path="/" element={<HomeEntry/>}/><Route path="/post" element={<PostEntryPage/>}/><Route path="/mock-payment/:contentId" element={<MockPaymentPage/>}/><Route path="/my-submissions" element={<MySubmissionsPage/>}/><Route path="/my-posts" element={<MyPostsPage/>}/><Route path="/call-history" element={<CallHistoryPage/>}/>
          <Route path="/view/:id" element={<ContentDetailPage/>}/><Route path="/offer/:id" element={<OfferDetailPage/>}/><Route path="/search" element={<SearchPage/>}/>
          <Route path="/shops" element={<ListingPage type="shop" title="Business / Shops" subtitle="Discover local businesses and shops around Madurandhagam."/>}/>
          <Route path="/workers" element={<ListingPage type="worker" title="Workers" subtitle="Find local skilled workers and service professionals."/>}/><Route path="/jobs" element={<ListingPage type="job" title="Jobs" subtitle="Local jobs and opportunities."/>}/><Route path="/vehicles" element={<ListingPage type="vehicle" title="Vehicles" subtitle="Local vehicle listings."/>}/><Route path="/events" element={<ListingPage type="event" title="Events" subtitle="Community events and programmes."/>}/><Route path="/services" element={<ListingPage type="service" title="Services" subtitle="Useful local services in one place."/>}/><Route path="/offers" element={<ListingPage type="offer" title="Offers" subtitle="Current local offers and promotions."/>}/><Route path="/updates" element={<ListingPage type="post" title="Posts & Updates" subtitle="News, videos and updates from around Madurandhagam."/>}/>
          <Route path="/notifications" element={<NotificationsPage/>}/><Route path="/chat" element={<ChatPage/>}/><Route path="/profile" element={<ProfilePage/>}/><Route path="/profile/:userId" element={<PublicProfilePage/>}/><Route path="/profile/:userId/followers" element={<FollowListPage mode="followers"/>}/><Route path="/profile/:userId/following" element={<FollowListPage mode="following"/>}/><Route path="/follow-requests" element={<FollowRequestsPage/>}/>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  </>;
}
