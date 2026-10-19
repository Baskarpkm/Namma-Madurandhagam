import { UserRound } from 'lucide-react';

export default function UserAvatar({user,sizeClass='h-10 w-10',iconSize=20,className=''}){
  const gender=user?.gender||user?.userGender||'other';
  const photo=user?.profilePhotoUrl||user?.userPhotoUrl||'';
  if(photo)return <span className={`block shrink-0 overflow-hidden rounded-full bg-slate-100 ${sizeClass} ${className}`}><img src={photo} alt={user?.name||user?.userName||'User'} className="h-full w-full object-cover"/></span>;
  const tone=gender==='female'?'bg-rose-100 text-rose-600':gender==='male'?'bg-sky-100 text-sky-700':'bg-slate-100 text-slate-600';
  const badge=gender==='female'?'F':gender==='male'?'M':'';
  return <span className={`relative grid shrink-0 place-items-center rounded-full ${tone} ${sizeClass} ${className}`}>
    <UserRound size={iconSize}/>
    {badge&&<span className="absolute -bottom-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-white px-1 text-[9px] font-black shadow">{badge}</span>}
  </span>;
}
