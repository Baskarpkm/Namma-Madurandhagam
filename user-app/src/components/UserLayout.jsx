import { Outlet } from 'react-router-dom';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';
export default function UserLayout(){return <div className="min-h-screen bg-[#f6f9ff]"><AppHeader/><Outlet/><BottomNav/></div>}
