import { Home, MessageCircle, Plus, UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const links = [
  ['/', Home, 'Home'],
  ['/post', Plus, 'Post'],
  ['/chat', MessageCircle, 'Chat'],
  ['/profile', UserRound, 'Profile'],
];

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-xl grid-cols-4">
        {links.map(([to, Icon, label]) => (
          <NavLink key={to} to={to} end={to === '/'}>
            {({ isActive }) => (
              <span
                className={`relative flex flex-col items-center gap-1 px-1 py-2 text-[11px] font-bold ${
                  isActive ? 'text-blue-600' : 'text-slate-500'
                }`}
              >
                {to === '/post' ? (
                  <span
                    className={`-mt-5 grid h-12 w-12 place-items-center rounded-full border-4 border-white text-white shadow-lg ${
                      isActive ? 'bg-blue-700' : 'bg-blue-600'
                    }`}
                  >
                    <Icon size={24} />
                  </span>
                ) : (
                  <Icon size={20} />
                )}
                <span>{label}</span>
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
