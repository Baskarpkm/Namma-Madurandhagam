import { Link } from 'react-router-dom';

const policyLinks = [
  ['/terms-and-conditions', 'Terms'],
  ['/privacy-policy', 'Privacy'],
  ['/refund-cancellation', 'Refunds'],
  ['/pricing-services', 'Pricing & Products'],
  ['/shipping-delivery', 'Shipping'],
  ['/contact-us', 'Contact'],
];

export default function SiteFooter(){
  return (
    <footer className="mt-8 border-t border-blue-100 bg-white/95 px-4 pt-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] text-slate-600 md:pb-4">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-black text-blue-700">Namma Madurandhagam</p>
          <p className="mt-0.5 text-[11px] font-medium text-slate-400">Local community & digital publishing platform</p>
        </div>
        <nav aria-label="Website policies" className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] font-bold sm:justify-end">
          {policyLinks.map(([to,label]) => (
            <Link key={to} to={to} className="hover:text-blue-700 hover:underline">{label}</Link>
          ))}
        </nav>
      </div>
      <p className="mx-auto mt-3 max-w-6xl border-t border-slate-100 pt-3 text-[10px] text-slate-400">
        © {new Date().getFullYear()} Namma Madurandhagam. All rights reserved.
      </p>
    </footer>
  );
}
