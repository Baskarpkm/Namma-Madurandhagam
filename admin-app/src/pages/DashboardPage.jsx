import { Activity, AlertTriangle, BriefcaseBusiness, CalendarDays, Car, Clock3, CreditCard, FileText, Gauge, Image, MessageCircle, RefreshCw, Store, Users, UsersRound, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../lib/api';
import StatCard from '../components/StatCard';
import AdminUserAvatar from '../components/AdminUserAvatar';

const cards=[
  ['post','Total Posts',FileText],['shop','Businesses / Shops',Store],['offer','Offers',Zap],['banner','Banners',Image],['job','Jobs',BriefcaseBusiness],['vehicle','Vehicles',Car],['worker','Worker Listings',UsersRound],['event','Events',CalendarDays]
];

export default function DashboardPage(){
  const [stats,setStats]=useState({users:0,listings:0,messages:0,pending:0,paymentPending:0,expiringSoon:0,typeCounts:{},liveCounts:{}});
  const [presence,setPresence]=useState({onlineNow:0,activeLast5Min:0,todayPeakOnline:0});
  const [expiring,setExpiring]=useState([]),[recentUsers,setRecentUsers]=useState([]),[ok,setOk]=useState(true);

  const loadPresence=()=>adminApi('/admin/presence',{cache:'no-store'}).then(setPresence).catch(()=>{});
  const load=()=>Promise.all([
    adminApi('/admin/stats',{cache:'no-store'}),
    adminApi('/admin/expiry-alerts?days=3',{cache:'no-store'}),
    adminApi('/admin/users',{cache:'no-store'}),
    adminApi('/admin/presence',{cache:'no-store'})
  ]).then(([a,b,c,d])=>{setStats(a);setExpiring(b);setRecentUsers(c.slice(0,8));setPresence(d);setOk(true)}).catch(()=>setOk(false));

  useEffect(()=>{
    load();
    const timer=setInterval(loadPresence,10000);
    const onFocus=()=>loadPresence();
    const onVisible=()=>{if(document.visibilityState==='visible')loadPresence()};
    window.addEventListener('focus',onFocus);
    document.addEventListener('visibilitychange',onVisible);
    return()=>{clearInterval(timer);window.removeEventListener('focus',onFocus);document.removeEventListener('visibilitychange',onVisible)};
  },[]);

  return <section>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black tracking-[.16em] text-blue-600">OVERVIEW</p><h2 className="mt-1 text-3xl font-black">Dashboard</h2><p className="mt-1 text-sm text-slate-500">Users, live activity, content lifecycle, payments and renewals.</p></div><div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${ok?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-700'}`}>{ok?'Backend Connected':'Backend Check Needed'}</span><button onClick={load} className="rounded-xl border bg-white p-2.5"><RefreshCw size={18}/></button></div></div>

    <h3 className="mt-6 text-sm font-black uppercase tracking-[.14em] text-slate-400">Live Users</h3>
    <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Link to="/users"><StatCard label="Total Registered" value={stats.users} icon={Users} help="All registered users"/></Link>
      <StatCard label="Online Now" value={presence.onlineNow||0} icon={Activity} help="Active in the last ~90 seconds"/>
      <StatCard label="Active Last 5 Min" value={presence.activeLast5Min||0} icon={Clock3} help="Unique recently active users"/>
      <StatCard label="Today Peak Online" value={presence.todayPeakOnline||0} icon={Gauge} help="Highest concurrent count today"/>
    </div>

    <h3 className="mt-8 text-sm font-black uppercase tracking-[.14em] text-slate-400">Operations</h3>
    <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Link to="/submissions"><StatCard label="Pending Review" value={stats.pending} icon={AlertTriangle} help="Needs Admin action"/></Link><Link to="/payments"><StatCard label="Payment Pending" value={stats.paymentPending} icon={CreditCard}/></Link><Link to="/expiry-alerts"><StatCard label="Expiring in 3 Days" value={stats.expiringSoon} icon={AlertTriangle} help="Renewal alerts"/></Link><Link to="/chat"><StatCard label="Chat Conversations" value={stats.conversations??stats.messages} icon={MessageCircle}/></Link></div>

    <h3 className="mt-8 text-xl font-black">Content Overview</h3><p className="mt-1 text-sm text-slate-500">Click any card to open Live / Expiring / Renewal / Pending / Expired filters.</p><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([type,label,Icon])=><Link key={type} to={`/lifecycle/${type}`}><StatCard label={label} value={stats.typeCounts?.[type]||0} icon={Icon} help={`${stats.liveCounts?.[type]||0} live`}/></Link>)}</div>

    <div className="mt-8 grid gap-4 lg:grid-cols-[.8fr_1.2fr]"><article className="rounded-3xl border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-black tracking-[.14em] text-blue-600">COMMUNITY</p><h3 className="mt-1 text-xl font-black">Recent Users</h3></div><Link to="/users" className="text-sm font-extrabold text-blue-600">All {stats.users}</Link></div><div className="mt-4 flex flex-wrap gap-3">{recentUsers.map(u=><Link to="/users" key={u._id} className="w-16 text-center"><AdminUserAvatar user={u} size="h-12 w-12 mx-auto"/><p className="mt-1 truncate text-[11px] font-bold">{u.name}</p></Link>)}{!recentUsers.length&&<p className="text-sm text-slate-400">No users yet.</p>}</div></article><article className="rounded-3xl border bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black tracking-[.14em] text-orange-600">RENEWAL ALERTS</p><h3 className="mt-1 text-xl font-black">Expiring within 3 days</h3></div><Link to="/expiry-alerts" className="text-sm font-extrabold text-blue-600">View all</Link></div><div className="mt-4 space-y-3">{expiring.slice(0,6).map(x=><article key={x._id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 p-3"><AdminUserAvatar user={x.ownerUserId}/><div className="min-w-0 flex-1"><p className="truncate font-extrabold">{x.title}</p><p className="text-xs text-slate-500">{x.ownerUserId?.name||'Admin'} • {x.type} • {x.planLabel||'No plan'}</p></div><div className="text-right"><p className="text-sm font-black text-orange-600">{x.daysLeft} day{x.daysLeft===1?'':'s'} left</p><p className="text-xs text-slate-400">{new Date(x.expiresAt).toLocaleDateString()}</p></div></article>)}{!expiring.length&&<p className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">No paid listings are expiring in the next 3 days.</p>}</div></article></div>
  </section>
}
