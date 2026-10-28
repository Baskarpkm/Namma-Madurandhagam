export default function BrandLogo({className='h-11 w-11',rounded='rounded-2xl'}){
  return <img src="/app-logo.png" alt="Namma Madurandhagam" className={`${className} ${rounded} object-cover shadow-sm`} />;
}
