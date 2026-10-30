import { useEffect, useRef, useState } from 'react';

export default function ExpandablePostText({text,className=''}){
  const ref=useRef(null);
  const [expanded,setExpanded]=useState(false);
  const [overflowing,setOverflowing]=useState(false);

  useEffect(()=>{
    setExpanded(false);
    const measure=()=>{
      const el=ref.current;
      if(!el)return;
      const previous=el.style.maxHeight;
      el.style.maxHeight='2.25rem';
      setOverflowing(el.scrollHeight>el.clientHeight+1);
      el.style.maxHeight=previous;
    };
    requestAnimationFrame(measure);
    const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;
    if(ref.current)observer?.observe(ref.current);
    window.addEventListener('resize',measure);
    return()=>{observer?.disconnect();window.removeEventListener('resize',measure)};
  },[text]);

  if(!text)return null;
  return <div className={className}>
    <p
      ref={ref}
      className="whitespace-pre-wrap break-words text-sm text-slate-600"
      style={{lineHeight:'1.5rem',maxHeight:expanded?'none':'2.25rem',overflow:expanded?'visible':'hidden'}}
    >{text}</p>
    {overflowing&&<button type="button" onClick={()=>setExpanded(v=>!v)} className="mt-0.5 text-xs font-extrabold text-slate-500 hover:text-slate-800">{expanded?'less':'more'}</button>}
  </div>;
}
