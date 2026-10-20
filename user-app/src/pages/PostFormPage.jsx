import { ArrowLeft, Scissors } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PostPage from './PostPage';

const labels = {
  status: 'Create Story',
  post: 'Create Normal Post',
  banner: 'Create Banner',
  job: 'Post a Job',
  event: 'Post an Event',
  offer: 'Post an Offer',
  shop: 'List Shop / Business',
  vehicle: 'Post a Vehicle',
  worker: 'Create Worker Listing',
};

export default function PostFormPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryType = new URLSearchParams(location.search).get('type');
  const source = location.state?.resubmit || location.state?.editOriginal || null;
  const type = source?.type || queryType || 'post';
  const isEditFlow = Boolean(location.state?.resubmit || location.state?.editOriginal);

  return (
    <div className="post-form-shell">
      <style>{`
        .post-form-shell > main > div:first-child { display: none !important; }
        .post-form-shell > main > div:nth-child(2):not(form) { display: none !important; }
        .post-form-shell > main { padding-top: .75rem !important; }
      `}</style>

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pt-5">
        <button type="button" onClick={() => (isEditFlow ? navigate('/my-submissions') : navigate('/post'))} className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-extrabold text-slate-600">
          <ArrowLeft size={17} /> {isEditFlow ? 'My Submissions' : 'Categories'}
        </button>
        <Link to="/my-submissions" className="text-sm font-extrabold text-blue-600">My Posts</Link>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-3">
        <p className="text-xs font-black uppercase tracking-[.16em] text-blue-600">CREATE</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">{labels[type] || 'Create Post'}</h1>
        {['status','post'].includes(type)&&<div className="mt-3 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800"><Scissors className="mt-0.5 shrink-0" size={18}/><p>{type==='status'?<><b>Story video:</b> You can choose a longer video. It will automatically use the first <b>30 seconds</b>.</>:<><b>Post video:</b> You can choose a longer video. It will automatically use the first <b>2 minutes</b>.</>}</p></div>}
      </div>

      <PostPage />
    </div>
  );
}
