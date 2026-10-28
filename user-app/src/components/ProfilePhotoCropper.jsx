import { Check, Minus, Plus, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

const VIEW=280;
const OUTPUT=512;

export default function ProfilePhotoCropper({file,onCancel,onApply}){
  const imgRef=useRef(null);
  const dragRef=useRef(null);
  const [src,setSrc]=useState('');
  const [natural,setNatural]=useState({w:0,h:0});
  const [zoom,setZoom]=useState(1);
  const [offset,setOffset]=useState({x:0,y:0});
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    if(!file)return;
    const url=URL.createObjectURL(file);
    setSrc(url);
    setZoom(1);
    setOffset({x:0,y:0});
    return()=>URL.revokeObjectURL(url);
  },[file]);

  const metrics=useMemo(()=>{
    if(!natural.w||!natural.h)return null;
    const base=Math.max(VIEW/natural.w,VIEW/natural.h);
    const scale=base*zoom;
    const w=natural.w*scale,h=natural.h*scale;
    return {base,scale,w,h,maxX:Math.max(0,(w-VIEW)/2),maxY:Math.max(0,(h-VIEW)/2)};
  },[natural,zoom]);

  const clamp=(next,m=metrics)=>({
    x:Math.max(-(m?.maxX||0),Math.min(m?.maxX||0,next.x)),
    y:Math.max(-(m?.maxY||0),Math.min(m?.maxY||0,next.y))
  });

  useEffect(()=>{
    if(metrics)setOffset(v=>clamp(v,metrics));
  },[metrics?.w,metrics?.h]);

  const pointerDown=e=>{
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current={x:e.clientX,y:e.clientY,startX:offset.x,startY:offset.y};
  };
  const pointerMove=e=>{
    if(!dragRef.current||!metrics)return;
    const d=dragRef.current;
    setOffset(clamp({x:d.startX+(e.clientX-d.x),y:d.startY+(e.clientY-d.y)}));
  };
  const pointerUp=()=>{dragRef.current=null};

  const apply=async()=>{
    if(!metrics||!imgRef.current||busy)return;
    setBusy(true);
    try{
      const canvas=document.createElement('canvas');
      canvas.width=OUTPUT;canvas.height=OUTPUT;
      const ctx=canvas.getContext('2d');
      const sourceSize=VIEW/metrics.scale;
      const sourceX=((metrics.w-VIEW)/2-offset.x)/metrics.scale;
      const sourceY=((metrics.h-VIEW)/2-offset.y)/metrics.scale;
      ctx.drawImage(
        imgRef.current,
        Math.max(0,sourceX),
        Math.max(0,sourceY),
        Math.min(sourceSize,natural.w),
        Math.min(sourceSize,natural.h),
        0,0,OUTPUT,OUTPUT
      );
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.92));
      if(!blob)throw new Error('Unable to crop image');
      await onApply?.(blob);
    }finally{
      setBusy(false);
    }
  };

  if(!file)return null;

  return <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/80 p-4" data-auto-sync-pause="true">
    <section className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-2xl">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-black">Crop profile photo</h2><p className="text-xs text-slate-500">Drag the photo and zoom to choose the exact portion.</p></div>
        <button type="button" onClick={onCancel} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100"><X size={18}/></button>
      </div>

      <div
        className="relative mx-auto mt-5 h-[280px] w-[280px] touch-none overflow-hidden rounded-full bg-slate-950 ring-4 ring-blue-100"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
      >
        {src&&<img
          ref={imgRef}
          src={src}
          alt="Crop preview"
          draggable="false"
          onLoad={e=>setNatural({w:e.currentTarget.naturalWidth,h:e.currentTarget.naturalHeight})}
          className="pointer-events-none absolute select-none max-w-none"
          style={metrics?{
            width:`${metrics.w}px`,
            height:`${metrics.h}px`,
            left:'50%',
            top:'50%',
            transform:`translate(-50%,-50%) translate(${offset.x}px,${offset.y}px)`
          }:{opacity:0}}
        />}
        <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/70"/>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Minus size={17} className="text-slate-400"/>
        <input aria-label="Zoom" type="range" min="1" max="3" step="0.01" value={zoom} onChange={e=>setZoom(Number(e.target.value))} className="w-full accent-blue-600"/>
        <Plus size={17} className="text-slate-400"/>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} className="rounded-xl border px-4 py-3 font-extrabold text-slate-600">Cancel</button>
        <button type="button" disabled={busy||!metrics} onClick={apply} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-extrabold text-white disabled:opacity-50"><Check size={18}/>{busy?'Applying...':'Apply'}</button>
      </div>
    </section>
  </div>;
}
