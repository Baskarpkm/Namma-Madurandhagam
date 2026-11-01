import { BarChart3, CreditCard, Eye, Heart, MessageCircle, MousePointerClick, RefreshCw, Share2, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../lib/api';

const money=n=>`₹${Number(n||0).toLocaleString('en-IN')}`;
const labelize=value=>String(value||'-').replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase());

function Metric({label,value,icon:Icon,help}){
  return <article className="rounded-3xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Icon size={20}/></span><div><p className="text-xs font-black uppercase tracking-[.12em] text-slate-400">{label}</p><p className="mt-1 text-2xl font-black text-slate-900">{value}</p></div></div>{help&&<p className="mt-3 text-xs leading-5 text-slate-500">{help}</p>}</article>
}

export default function AnalyticsPage(){
  const [data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  const load=async()=>{setLoading(true);setError('');try{setData(await adminApi('/admin/analytics',{cache:'no-store'}))}catch(e){setError(e.message)}finally{setLoading(false)}};
  useEffect(()=>{load()},[]);
  const maxDaily=useMemo(()=>Math.max(1,...(data?.dailyRevenue||[]).map(x=>Number(x.revenue||0))),[data]);
  const contentRows=useMemo(()=>Object.entries(data?.contentByType||{}).sort((a,b)=>b[1].total-a[1].total),[data]);
  const s=data?.summary||{};

  return <section>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black tracking-[.16em] text-blue-600">INSIGHTS</p><h2 className="mt-1 text-3xl font-black">Analytics</h2><p className="mt-1 text-sm text-slate-500">Revenue, plan performance, engagement, users and content lifecycle in one place.</p></div><button onClick={load} className="rounded-xl border bg-white p-2.5"><RefreshCw size={18}/></button></div>
    {error&&<p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading&&!data?<div className="mt-5 h-48 animate-pulse rounded-3xl bg-slate-100"/>:<>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Paid Revenue" value={money(s.revenue)} icon={CreditCard} help={`${Number(s.payments||0).toLocaleString('en-IN')} paid transactions`}/>
        <Metric label="Story Views" value={Number(s.storyViews||0).toLocaleString('en-IN')} icon={Eye} help="Unique story-view records currently stored"/>
        <Metric label="Tracked Impressions" value={Number(s.impressions||0).toLocaleString('en-IN')} icon={BarChart3} help="Banner/content impression counters when tracking data is available"/>
        <Metric label="Tracked Clicks" value={Number(s.clicks||0).toLocaleString('en-IN')} icon={MousePointerClick} help={`CTR ${Number(s.ctr||0).toFixed(2)}%`}/>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Post Likes" value={Number(s.likes||0).toLocaleString('en-IN')} icon={Heart}/>
        <Metric label="Comments" value={Number(s.comments||0).toLocaleString('en-IN')} icon={MessageCircle}/>
        <Metric label="Shares" value={Number(s.shares||0).toLocaleString('en-IN')} icon={Share2}/>
        <Metric label="Active Users" value={Number(data?.userStatuses?.active||0).toLocaleString('en-IN')} icon={Users} help={`${data?.userStatuses?.suspended||0} suspended • ${data?.userStatuses?.banned||0} banned`}/>
      </div>

      <div className="mt-7 grid gap-5 xl:grid-cols-2">
        <article className="rounded-3xl border bg-white p-5 shadow-sm"><div><p className="text-xs font-black tracking-[.14em] text-blue-600">REVENUE</p><h3 className="mt-1 text-xl font-black">Revenue by Category</h3></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[480px] text-sm"><thead className="text-left text-xs uppercase text-slate-400"><tr><th className="pb-3">Category</th><th className="pb-3 text-right">Payments</th><th className="pb-3 text-right">Revenue</th></tr></thead><tbody className="divide-y">{(data?.revenueByType||[]).map(x=><tr key={x.type}><td className="py-3 font-extrabold">{labelize(x.type)}</td><td className="py-3 text-right">{x.payments}</td><td className="py-3 text-right font-black text-blue-700">{money(x.revenue)}</td></tr>)}{!(data?.revenueByType||[]).length&&<tr><td colSpan="3" className="py-8 text-center text-slate-400">No paid revenue yet.</td></tr>}</tbody></table></div></article>

        <article className="rounded-3xl border bg-white p-5 shadow-sm"><div><p className="text-xs font-black tracking-[.14em] text-emerald-600">30 DAYS</p><h3 className="mt-1 text-xl font-black">Daily Revenue</h3></div><div className="mt-4 max-h-[330px] space-y-3 overflow-y-auto pr-1">{(data?.dailyRevenue||[]).map(x=><div key={x.date}><div className="mb-1 flex items-center justify-between text-xs"><span className="font-bold text-slate-500">{new Date(`${x.date}T00:00:00`).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</span><span className="font-black">{money(x.revenue)} <span className="font-medium text-slate-400">({x.payments})</span></span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{width:`${Math.max(3,Math.round((Number(x.revenue||0)/maxDaily)*100))}%`}}/></div></div>)}{!(data?.dailyRevenue||[]).length&&<p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-400">No paid transactions in the last 30 days.</p>}</div></article>
      </div>

      <article className="mt-5 rounded-3xl border bg-white p-5 shadow-sm"><div><p className="text-xs font-black tracking-[.14em] text-violet-600">PLANS</p><h3 className="mt-1 text-xl font-black">Plan Performance</h3></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="p-3">Type</th><th className="p-3">Plan</th><th className="p-3">Code</th><th className="p-3 text-right">Purchases</th><th className="p-3 text-right">Revenue</th></tr></thead><tbody className="divide-y">{(data?.revenueByPlan||[]).map((x,i)=><tr key={`${x.type}-${x.code}-${i}`}><td className="p-3 font-bold">{labelize(x.type)}</td><td className="p-3 font-extrabold">{x.label}</td><td className="p-3 text-xs text-slate-400">{x.code||'-'}</td><td className="p-3 text-right">{x.payments}</td><td className="p-3 text-right font-black text-blue-700">{money(x.revenue)}</td></tr>)}{!(data?.revenueByPlan||[]).length&&<tr><td colSpan="5" className="p-8 text-center text-slate-400">No paid plan data yet.</td></tr>}</tbody></table></div></article>

      <article className="mt-5 rounded-3xl border bg-white p-5 shadow-sm"><div><p className="text-xs font-black tracking-[.14em] text-orange-600">LIFECYCLE</p><h3 className="mt-1 text-xl font-black">Content Status by Type</h3></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[840px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="p-3">Type</th><th className="p-3 text-right">Total</th><th className="p-3 text-right">Live</th><th className="p-3 text-right">Pending</th><th className="p-3 text-right">Changes</th><th className="p-3 text-right">Expired</th><th className="p-3 text-right">Rejected</th></tr></thead><tbody className="divide-y">{contentRows.map(([type,x])=><tr key={type}><td className="p-3 font-extrabold">{labelize(type)}</td><td className="p-3 text-right font-black">{x.total}</td><td className="p-3 text-right text-emerald-700">{x.approved}</td><td className="p-3 text-right text-orange-600">{x.pending+x.paymentPending}</td><td className="p-3 text-right">{x.changesRequired}</td><td className="p-3 text-right text-slate-500">{x.expired}</td><td className="p-3 text-right text-red-600">{x.rejected}</td></tr>)}</tbody></table></div></article>
    </>}
  </section>
}
