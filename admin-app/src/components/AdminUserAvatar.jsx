import { UserRound } from 'lucide-react';
export default function AdminUserAvatar({user,size='h-10 w-10'}){
  if(user?.profilePhotoUrl)return <img src={user.profilePhotoUrl} alt={user.name||'User'} className={`${size} shrink-0 rounded-full border bg-white object-cover`}/>;
  return <span className={`${size} grid shrink-0 place-items-center rounded-full border bg-blue-50 text-blue-600`}><UserRound size={18}/></span>;
}
