import { BriefcaseBusiness, CalendarDays, Car, ImagePlus, Megaphone, Newspaper, Store, UserRoundCog, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const typeOptions = [
  { type: 'status', label: 'Story', sub: 'WhatsApp-style 24-hour story', Icon: Zap },
  { type: 'post', label: 'Normal Post', sub: 'Permanent post until you delete it', Icon: Newspaper },
  { type: 'banner', label: 'Banner', sub: 'Promotional home banner', Icon: ImagePlus },
  { type: 'job', label: 'Job', sub: 'Weekly / monthly hiring post', Icon: BriefcaseBusiness },
  { type: 'event', label: 'Event', sub: 'Function / programme / meeting', Icon: CalendarDays },
  { type: 'offer', label: 'Offer', sub: 'Weekly / monthly business offer', Icon: Megaphone },
  { type: 'shop', label: 'Business / Shops', sub: '₹999 one-time, no expiry', Icon: Store },
  { type: 'vehicle', label: 'Vehicle', sub: 'Weekly / monthly vehicle listing', Icon: Car },
  { type: 'worker', label: 'Worker Listing', sub: '₹399 one-time, no expiry', Icon: UserRoundCog },
];

export default function PostCategoryPage() {
  const navigate = useNavigate();
  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 md:pb-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-black tracking-[.16em] text-blue-600">CREATE</p><h1 className="mt-1 text-3xl font-black">Choose a category</h1><p className="mt-1 text-sm text-slate-500">Select what you want to post. The selected category form will open on the next screen.</p></div>
        <Link to="/my-submissions" className="rounded-xl border bg-white px-4 py-2.5 text-sm font-extrabold text-blue-600">My Submissions</Link>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {typeOptions.map(({ type, label, sub, Icon }) => <button key={type} type="button" onClick={() => navigate(`/post?type=${type}`)} className="rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md active:scale-[.99]"><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-600"><Icon size={21}/></span><p className="mt-3 text-sm font-black text-slate-900">{label}</p><p className="mt-1 text-[11px] leading-4 text-slate-500">{sub}</p></button>)}
      </div>
    </main>
  );
}
