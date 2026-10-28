import { useCallback, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';
import GlobalRefreshFix from './components/GlobalRefreshFix';
import LiveAutoSync from './components/LiveAutoSync';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ContentManagerPage from './pages/ContentManagerPage';
import CategoryPage from './pages/CategoryPage';
import PlansPage from './pages/PlansPage';
import LifecyclePage from './pages/LifecyclePage';
import ExpiryAlertsPage from './pages/ExpiryAlertsPage';
import UsersPage from './pages/UsersPage';
import ChatInboxPage from './pages/ChatInboxPage';
import ChatConversationPage from './pages/ChatConversationPage';
import PaymentsPage from './pages/PaymentsPage';
import SettingsPage from './pages/SettingsPage';
import SimplePage from './pages/SimplePage';
import SubmissionsPage from './pages/SubmissionsPage';

export default function App(){
  const [syncKey,setSyncKey]=useState(0);
  const softSync=useCallback(()=>setSyncKey(x=>x+1),[]);

  return <>
    <GlobalRefreshFix/>
    <LiveAutoSync onSync={softSync}/>
    <Routes key={syncKey}>
      <Route path="/login" element={<LoginPage/>}/>
      <Route element={<ProtectedRoute/>}>
        <Route element={<AdminLayout/>}>
          <Route path="/" element={<DashboardPage/>}/>
          <Route path="/submissions" element={<SubmissionsPage/>}/>
          <Route path="/plans" element={<PlansPage/>}/>
          <Route path="/plans/:type" element={<PlansPage/>}/>
          <Route path="/expiry-alerts" element={<ExpiryAlertsPage/>}/>
          <Route path="/lifecycle/:type" element={<LifecyclePage/>}/>
          <Route path="/banners" element={<ContentManagerPage type="banner" title="Banners" description="Admin banners publish directly. Paid user banner submissions are reviewed in User Submissions."/>}/>
          <Route path="/categories" element={<CategoryPage/>}/>
          <Route path="/businesses" element={<ContentManagerPage type="shop" title="Businesses" description="Approved shops and business listings."/>}/>
          <Route path="/services" element={<ContentManagerPage type="service" title="Services" description="Useful local services."/>}/>
          <Route path="/workers" element={<ContentManagerPage type="worker" title="Workers" description="Local worker self-promotional listings."/>}/>
          <Route path="/jobs" element={<ContentManagerPage type="job" title="Jobs" description="Local employment and hiring posts."/>}/>
          <Route path="/vehicles" element={<ContentManagerPage type="vehicle" title="Vehicles" description="Vehicle listings."/>}/>
          <Route path="/events" element={<ContentManagerPage type="event" title="Events" description="Community events and programmes."/>}/>
          <Route path="/offers" element={<ContentManagerPage type="offer" title="Offers" description="Local offers and promotions."/>}/>
          <Route path="/posts" element={<ContentManagerPage type="post" title="Posts" description="All admin and user posts. Admin can directly edit or delete any post." includeUserContent/>}/>
          <Route path="/notifications" element={<ContentManagerPage type="incident" title="Alerts" description="Important alerts and incident notifications."/>}/>
          <Route path="/reports" element={<ContentManagerPage type="status" title="Stories" description="Admin-created 24-hour stories/status items."/>}/>
          <Route path="/users" element={<UsersPage/>}/>
          <Route path="/chat" element={<ChatInboxPage/>}/>
          <Route path="/chat/:userId" element={<ChatConversationPage/>}/>
          <Route path="/payments" element={<PaymentsPage/>}/>
          <Route path="/analytics" element={<SimplePage eyebrow="INSIGHTS" title="Analytics">Use Dashboard lifecycle cards for current live, expiry and renewal counts. More charts can be added after production data grows.</SimplePage>}/>
          <Route path="/settings" element={<SettingsPage/>}/>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  </>;
}
