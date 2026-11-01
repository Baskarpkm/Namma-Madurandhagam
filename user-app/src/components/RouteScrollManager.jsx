import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const currentPath=(location)=>`${location.pathname}${location.search}`;

export default function RouteScrollManager(){
  const location=useLocation();
  const navigationType=useNavigationType();

  useEffect(()=>{
    if('scrollRestoration' in window.history)window.history.scrollRestoration='manual';
  },[]);

  useEffect(()=>{
    const path=currentPath(location);
    let restored=false;
    if(navigationType==='POP'){
      try{
        const saved=JSON.parse(sessionStorage.getItem('nm-feed-return')||'null');
        if(saved?.path===path&&Number.isFinite(Number(saved.y))){
          restored=true;
          const y=Math.max(0,Number(saved.y));
          requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo({top:y,left:0,behavior:'auto'})));
          sessionStorage.removeItem('nm-feed-return');
        }
      }catch{}
    }
    if(!restored)requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'auto'}));
  },[location.key,location.pathname,location.search,navigationType]);

  return null;
}
