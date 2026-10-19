import { Bell, Home, MapPin, MessageCircle, Plus, Search, UserRound } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { getUser } from '../lib/session';

const desktopLinks = [
  ['/', Home, 'Home'],
  ['/post', Plus, 'Post'],
  ['/chat', MessageCircle, 'Chat'],
  ['/profile', UserRound, 'Profile'],
];

export default function AppHeader(){
  const user=getUser();
  const nav=useNavigate();
  return <header className="sticky top-0 z-40 border-b border-blue-100/70 bg-white/95 backdrop-blur">
    <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
      <button onClick={()=>nav('/')} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-700 to-sky-500 font-black text-white shadow-lg shadow-blue-100">NM</button>
      <div className="min-w-0 flex-1 md:flex-none">
        <p className="text-[11px] font-extrabold tracking-[.18em] text-blue-600">NAMMA MADURANDHAGAM</p>
        <p className="flex items-center gap-1 truncate text-sm font-bold text-slate-700"><MapPin size={14} className="text-blue-500"/>{user?.village||'Madurandhagam'}</p>
      </div>

      <nav className="ml-4 hidden flex-1 items-center justify-center gap-1 md:flex">
        {desktopLinks.map(([to,Icon,label])=><NavLink key={to} to={to} end={to==='/'} className={({isActive})=>`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-extrabold transition ${isActive?'bg-blue-600 text-white shadow-md shadow-blue-100':'text-slate-600 hover:bg-blue-50 hover:text-blue-700'}`}><Icon size={18}/>{label}</NavLink>)}
      </nav>

      <div className="flex items-center gap-2">
        <button onClick={()=>nav('/search')} className="rounded-full border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50"><Search size={19}/></button>
        <Link to="/notifications" className="rounded-full border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50"><Bell size={19}/></Link>
      </div>
    </div>
  </header>
}
