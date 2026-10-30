import { useEffect } from 'react';

export default function MobileBackHider(){
  useEffect(()=>{
    const mark=()=>{
      document.querySelectorAll('button,a').forEach(el=>{
        const aria=String(el.getAttribute('aria-label')||'').trim();
        const text=String(el.textContent||'').trim();
        const hasBackIcon=Boolean(el.querySelector('.lucide-arrow-left'));
        const isBack=hasBackIcon||/^back\b/i.test(aria)||/^(go\s+)?back\b/i.test(text);
        if(isBack)el.setAttribute('data-nm-mobile-back','true');
        else if(el.getAttribute('data-nm-mobile-back')==='true')el.removeAttribute('data-nm-mobile-back');
      });
    };
    mark();
    const observer=new MutationObserver(mark);
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[]);
  return null;
}
