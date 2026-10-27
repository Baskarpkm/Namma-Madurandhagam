import { useEffect, useRef } from 'react';

export default function StoryViewportLock({children}){
  const start=useRef(null);
  useEffect(()=>{
    const y=window.scrollY;
    const old={overflow:document.body.style.overflow,position:document.body.style.position,top:document.body.style.top,width:document.body.style.width};
    document.body.style.overflow='hidden';
    document.body.style.position='fixed';
    document.body.style.top=`-${y}px`;
    document.body.style.width='100%';
    return()=>{
      document.body.style.overflow=old.overflow;
      document.body.style.position=old.position;
      document.body.style.top=old.top;
      document.body.style.width=old.width;
      window.scrollTo(0,y);
    };
  },[]);

  const onStart=(e)=>{const t=e.touches?.[0];if(t)start.current={x:t.clientX,y:t.clientY}};
  const onEnd=(e)=>{
    const s=start.current,t=e.changedTouches?.[0];start.current=null;
    if(!s||!t||e.target?.closest?.('.overflow-y-auto'))return;
    const dx=t.clientX-s.x,dy=t.clientY-s.y;
    if(Math.abs(dy)>45&&Math.abs(dy)>Math.abs(dx)){e.preventDefault();e.stopPropagation()}
  };

  return <div className="fixed inset-0 h-[100dvh] w-screen overflow-hidden bg-black" onTouchStartCapture={onStart} onTouchEndCapture={onEnd}>{children}</div>;
}
