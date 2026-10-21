import { Edit3, ImagePlus, Plus, RefreshCw, Search, Trash2, UploadCloud, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../lib/api';

const makeEmpty=()=>({title:'',description:'',mediaUrl:'',mediaType:'none',linkUrl:'',area:'',price:'',status:'approved',sortOrder:0,expiresAt:'',meta:{}});
const previewUrl=(item)=>item?.meta?.mediaItems?.[0]?.url||item?.mediaUrl||'';

export default function ContentManagerPage({type,title,description,includeUserContent=false}){
  const [items,setItems]=useState([]);
  const [form,setForm]=useState(makeEmpty());
  const [editing,setEditing]=useState(null);
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [uploading,setUploading]=useState(false);

  const load=()=>{
    const sourceFilter=includeUserContent?'':'&source=admin';
    return adminApi(`/content/admin?type=${type}${sourceFilter}`).then(setItems).catch(e=>setError(e.message));
  };

  useEffect(()=>{load()},[type,includeUserContent]);

  const filtered=useMemo(()=>items.filter(x=>`${x.title||''} ${x.area||''} ${x.ownerUserId?.name||''} ${x.ownerUserId?.mobile||''}`.toLowerCase().includes(query.toLowerCase())),[items,query]);

  const startCreate=()=>{setEditing(null);setForm(makeEmpty());setOpen(true)};
  const startEdit=x=>{
    setEditing(x._id);
    setForm({
      title:x.title||'',description:x.description||'',mediaUrl:x.mediaUrl||'',mediaType:x.mediaType||'none',linkUrl:x.linkUrl||'',area:x.area||'',price:x.price??'',
      status:x.status||'approved',sortOrder:x.sortOrder||0,expiresAt:x.expiresAt?String(x.expiresAt).slice(0,10):'',meta:{...(x.meta||{})}
    });
    setOpen(true);
  };

  const uploadImage=async(file)=>{
    if(!file)return;
    if(!file.type?.startsWith('image/')){setError('Please choose an image file.');return}
    if(file.size>10*1024*1024){setError('Image must be 10 MB or smaller.');return}
    setUploading(true);setError('');
    try{
      const fd=new FormData();fd.append('file',file);
      const result=await adminApi('/upload',{method:'POST',body:fd});
      setForm(prev=>({...prev,mediaUrl:result.url||'',mediaType:'image',meta:{...(prev.meta||{}),mediaItems:[]}}));
    }catch(e){setError(e.message)}finally{setUploading(false)}
  };

  const save=async(e)=>{
    e.preventDefault();setBusy(true);setError('');
    const payload={
      type,...form,
      price:form.price===''?undefined:Number(form.price),
      sortOrder:Number(form.sortOrder||0),
      expiresAt:form.expiresAt?new Date(form.expiresAt):null,
      mediaType:form.mediaUrl?(form.mediaType==='video'?'video':'image'):'none',
      meta:form.meta||{}
    };
    try{
      await adminApi(editing?`/content/${editing}`:'/content',{method:editing?'PATCH':'POST',body:JSON.stringify(payload)});
      setOpen(false);load();
    }catch(e){setError(e.message)}finally{setBusy(false)}
  };

  const del=async id=>{
    if(!confirm('Delete this item permanently?'))return;
    try{await adminApi(`/content/${id}`,{method:'DELETE'});load()}catch(e){setError(e.message)}
  };

  return <section>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-black tracking-[.16em] text-blue-600">CONTENT MANAGEMENT</p><h2 className="mt-1 text-3xl font-black">{title}</h2><p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p></div>
      <button onClick={startCreate} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-blue-100"><Plus size={18}/> Add {title.replace(/s$/,'')}</button>
    </div>

    {includeUserContent&&<p className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-800">This page includes both Admin posts and User posts. Edit and Delete actions work on every post.</p>}
    {error&&<p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

    <div className="mt-5 flex items-center gap-2 rounded-2xl border bg-white px-4 py-3 shadow-sm"><Search size={18} className="text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} className="w-full outline-none" placeholder={`Search ${title.toLowerCase()}...`}/><button onClick={load} className="text-slate-400"><RefreshCw size={18}/></button></div>

    <div className="mt-5 overflow-hidden rounded-3xl border bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Item</th>{includeUserContent&&<th className="px-4 py-3">Posted By</th>}<th className="px-4 py-3">Area</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Order</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
      <tbody className="divide-y">{filtered.map(x=><tr key={x._id} className="hover:bg-slate-50">
        <td className="px-4 py-3"><div className="flex items-center gap-3">{previewUrl(x)?<img src={previewUrl(x)} className="h-11 w-11 rounded-xl object-cover"/>:<span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-500"><ImagePlus size={18}/></span>}<div><p className="font-extrabold">{x.title||'Untitled'}</p><p className="max-w-sm truncate text-xs text-slate-400">{x.description||'-'}</p></div></div></td>
        {includeUserContent&&<td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${x.source==='user'?'bg-violet-50 text-violet-700':'bg-blue-50 text-blue-700'}`}>{x.source==='user'?'User':'Admin'}</span>{x.ownerUserId?.name&&<p className="mt-1 text-xs font-bold text-slate-600">{x.ownerUserId.name}</p>}</td>}
        <td className="px-4 py-3 text-slate-600">{x.area||'-'}</td>
        <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${x.status==='approved'?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>{x.status}</span></td>
        <td className="px-4 py-3">{x.sortOrder||0}</td>
        <td className="px-4 py-3"><div className="flex justify-end gap-2"><button onClick={()=>startEdit(x)} className="rounded-xl border p-2 text-blue-600" title="Edit"><Edit3 size={17}/></button><button onClick={()=>del(x._id)} className="rounded-xl border border-red-100 p-2 text-red-600" title="Delete"><Trash2 size={17}/></button></div></td>
      </tr>)}{filtered.length===0&&<tr><td colSpan={includeUserContent?6:5} className="px-4 py-12 text-center text-slate-400">No {title.toLowerCase()} added yet.</td></tr>}</tbody>
    </table></div></div>

    {open&&<div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/40 p-4"><form onSubmit={save} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
      <div className="flex items-center justify-between"><div><p className="text-xs font-black tracking-[.14em] text-blue-600">{editing?'EDIT':'CREATE'}</p><h3 className="text-2xl font-black">{editing?'Update':'Add'} {title.replace(/s$/,'')}</h3></div><button type="button" onClick={()=>setOpen(false)} className="rounded-xl border p-2"><X size={18}/></button></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Input label="Title *" value={form.title} onChange={v=>setForm({...form,title:v})}/>
        <Input label="Area / Village" value={form.area} onChange={v=>setForm({...form,area:v})}/>
        <label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-bold">Description</span><textarea rows="5" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="w-full rounded-xl border bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-400"/></label>
        <label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-bold">Image</span><div className="rounded-2xl border border-dashed bg-slate-50 p-4">{form.mediaUrl&&<div className="mb-4 flex items-start gap-3"><img src={form.mediaUrl} alt="Preview" className="h-28 w-36 rounded-2xl border bg-white object-contain"/><div className="min-w-0 flex-1"><p className="text-sm font-extrabold text-slate-700">Image ready</p><p className="mt-1 break-all text-xs text-slate-400">{form.mediaUrl}</p><button type="button" onClick={()=>setForm({...form,mediaUrl:'',mediaType:'none',meta:{...(form.meta||{}),mediaItems:[]}})} className="mt-2 text-xs font-extrabold text-red-600">Remove image</button></div></div>}<label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-extrabold ${uploading?'pointer-events-none opacity-60':''}`}><UploadCloud size={18}/>{uploading?'Uploading image...':form.mediaUrl?'Change image from device':'Choose image from device'}<input type="file" accept="image/*" className="hidden" onChange={e=>{uploadImage(e.target.files?.[0]);e.target.value=''}}/></label><p className="mt-2 text-xs text-slate-400">Uploading a replacement image will replace a user post gallery with this image. Text-only edits leave the existing gallery unchanged.</p></div></label>
        <Input label="Image URL (optional)" value={form.mediaUrl} onChange={v=>setForm({...form,mediaUrl:v})} placeholder="Or paste a public image URL"/>
        <Input label="Link / Route" value={form.linkUrl} onChange={v=>setForm({...form,linkUrl:v})} placeholder="/shops or https://..."/>
        <Input label="Price (optional)" type="number" value={form.price} onChange={v=>setForm({...form,price:v})}/>
        <Input label="Sort Order" type="number" value={form.sortOrder} onChange={v=>setForm({...form,sortOrder:v})}/>
        <label><span className="mb-1.5 block text-sm font-bold">Status</span><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="w-full rounded-xl border bg-slate-50 px-3 py-2.5 outline-none"><option value="approved">Approved</option><option value="draft">Draft</option><option value="pending">Pending</option><option value="changes-required">Changes Required</option><option value="rejected">Rejected</option><option value="expired">Expired</option></select></label>
        <Input label="Expiry Date" type="date" value={form.expiresAt} onChange={v=>setForm({...form,expiresAt:v})}/>
      </div>
      <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={()=>setOpen(false)} className="rounded-xl border px-4 py-2.5 font-bold">Cancel</button><button disabled={busy||uploading||!form.title.trim()} className="rounded-xl bg-blue-600 px-5 py-2.5 font-extrabold text-white disabled:opacity-50">{uploading?'Uploading...':busy?'Saving...':'Save'}</button></div>
    </form></div>}
  </section>
}

function Input({label,value,onChange,type='text',placeholder=''}){return <label><span className="mb-1.5 block text-sm font-bold">{label}</span><input type={type} value={value??''} placeholder={placeholder} onChange={e=>onChange(e.target.value)} className="w-full rounded-xl border bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-400"/></label>}
