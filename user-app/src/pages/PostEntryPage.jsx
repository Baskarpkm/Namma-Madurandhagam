import { useLocation } from 'react-router-dom';
import PostCategoryPage from './PostCategoryPage';
import PostFormPage from './PostFormPage';

const validTypes = new Set(['status', 'post', 'banner', 'job', 'event', 'offer', 'shop', 'vehicle', 'worker']);

export default function PostEntryPage() {
  const location = useLocation();
  const requestedType = new URLSearchParams(location.search).get('type');
  const hasEditState = Boolean(location.state?.resubmit || location.state?.editOriginal);
  const showForm = hasEditState || validTypes.has(requestedType);

  return showForm ? <PostFormPage /> : <PostCategoryPage />;
}
