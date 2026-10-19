import { BriefcaseBusiness, CalendarDays, Car, ImagePlus, Megaphone, Newspaper, Store, UploadCloud, UserRoundCog, X, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { getUser, getUserToken } from '../lib/session';

const typeOptions=[
  {type:'status',label:'Story',sub:'WhatsApp-style 24-hour story',Icon:Zap},
  {type:'post',label:'Normal Post',sub:'Permanent post until you delete it',Icon:Newspaper},
  {type:'banner',label:'Banner',sub:'Promotional home banner',Icon:ImagePlus},
  {type:'job',label:'Job',sub:'Weekly / monthly hiring post',Icon:BriefcaseBusiness},
  {type:'event',label:'Event',sub:'Function / programme / meeting',Icon:CalendarDays},
  {type:'offer',label:'Offer',sub:'Weekly / monthly business offer',Icon:Megaphone},
  {type:'shop',label:'Shop / Business',sub:'₹999 one-time, no expiry',Icon:Store},
  {type:'vehicle',label:'Vehicle',sub:'Weekly / monthly vehicle listing',Icon:Car},
  {type:'worker',label:'Worker Listing',sub:'₹399 one-time, no expiry',Icon:UserRoundCog}
];

const configs={
  status:{heading:'Create Story',titleLabel:'Story Title / Caption',descriptionLabel:'Story Text',descriptionPlaceholder:'Short story text...',mediaLabel:'Story Photo / Video',mediaHelp:'Image or video. Story video maximum 30 seconds.',mediaRequired:true,fields:[]},
  post:{heading:'Create Normal Post',titleLabel:'Post Title',descriptionLabel:'Full Post Details',descriptionPlaceholder:'Write the full local update, announcement or news...',mediaLabel:'Post Image / Video',mediaHelp:'You can publish an image or video. Approved posts stay live until you delete them.',fields:[{key:'postCategory',label:'Post Category',type:'select',required:true,options:['Local News','Community Update','Announcement','Education','Public Information','Other']}]},
  banner:{heading:'Create Banner',titleLabel:'Banner Title',descriptionLabel:'Banner Message',descriptionPlaceholder:'Short promotional message...',mediaLabel:'Banner Image',mediaHelp:'Upload a clear landscape banner image.',mediaRequired:true,fields:[{key:'advertiserName',label:'Advertiser / Business Name',required:true}]},
  job:{heading:'Post a Job',titleLabel:'Job Title',descriptionLabel:'Job Description',descriptionPlaceholder:'Work details, responsibilities and other information...',showContact:true,fields:[{key:'companyName',label:'Company / Business Name',required:true},{key:'jobType',label:'Job Type',type:'select',required:true,options:['Full Time','Part Time','Daily Wage','Contract','Internship','Other']},{key:'salary',label:'Salary / Pay',placeholder:'Example: ₹15,000 / month',required:true},{key:'qualification',label:'Qualification',placeholder:'Example: 10th / Diploma / Any degree'},{key:'experience',label:'Experience Required',placeholder:'Example: Fresher / 2 years'},{key:'vacancies',label:'No. of Vacancies',type:'number',required:true}]},
  event:{heading:'Post an Event',titleLabel:'Event Name',descriptionLabel:'Event Details',descriptionPlaceholder:'Explain the programme / event...',showContact:true,fields:[{key:'eventDate',label:'Event Date',type:'date',required:true},{key:'eventTime',label:'Event Time',type:'time',required:true},{key:'venue',label:'Venue',required:true},{key:'organizer',label:'Organizer Name',required:true}]},
  offer:{heading:'Post an Offer',titleLabel:'Offer Title',descriptionLabel:'Offer Details',descriptionPlaceholder:'Explain the offer and conditions...',showContact:true,fields:[{key:'businessName',label:'Business Name',required:true},{key:'originalPrice',label:'Original Price',type:'number'},{key:'offerPrice',label:'Offer Price',type:'number',required:true},{key:'validUntil',label:'Offer Valid Until',type:'date',required:true},{key:'offerCode',label:'Offer Code (optional)',placeholder:'Example: NM100'}]},
  shop:{heading:'List Shop / Business',titleLabel:'Business Name',descriptionLabel:'About the Business',descriptionPlaceholder:'Products, services and business details...',showContact:true,fields:[{key:'businessCategory',label:'Business Category',required:true,placeholder:'Example: Electrical / Hotel / Medical'},{key:'address',label:'Full Address',required:true},{key:'openingHours',label:'Opening Hours',required:true,placeholder:'Example: 9 AM - 9 PM'},{key:'whatsapp',label:'WhatsApp Number',placeholder:'10-digit number'}]},
  vehicle:{heading:'Post a Vehicle',titleLabel:'Vehicle Listing Title',descriptionLabel:'Vehicle Details',descriptionPlaceholder:'Condition, insurance, service history and other details...',showContact:true,fields:[{key:'vehicleType',label:'Vehicle Type',type:'select',required:true,options:['Bike','Scooter','Car','Auto','Goods Vehicle','Tractor','Other']},{key:'makeModel',label:'Make / Model',required:true,placeholder:'Example: Honda Activa 6G'},{key:'year',label:'Model Year',type:'number',required:true},{key:'fuel',label:'Fuel',type:'select',required:true,options:['Petrol','Diesel','CNG','Electric','Hybrid','Other']},{key:'kilometers',label:'Kilometres Driven',type:'number',required:true},{key:'ownerCount',label:'Owner',type:'select',required:true,options:['1st Owner','2nd Owner','3rd Owner','4th+ Owner']}]},
  worker:{heading:'Create Worker Listing',titleLabel:'Worker / Service Title',descriptionLabel:'Worker Details',descriptionPlaceholder:'Skills, work details and service information...',showContact:true,fields:[{key:'workerCategory',label:'Service Category',required:true,placeholder:'Electrician / Plumber / Mechanic'},{key:'experience',label:'Experience',required:true,placeholder:'Example: 5 years'},{key:'serviceCharge',label:'Starting Service Charge',placeholder:'Example: ₹300'},{key:'availability',label:'Availability',type:'select',required:true,options:['Available Daily','Weekdays','Weekends','On Call','Other']}]}
};

const initialMeta=(source,user)=>({
  postCategory:'',advertiserName:'',companyName:'',jobType:'',salary:'',qualification:'',experience:'',vacancies:'',eventDate:'',eventTime:'',venue:'',organizer:'',businessName:'',originalPrice:'',offerPrice:'',validUntil:'',offerCode:'',businessCategory:'',address:'',openingHours:'',whatsapp:'',vehicleType:'',makeModel:'',year:'',fuel:'',kilometers:'',ownerCount:'',workerCategory:'',serviceCharge:'',availability:'',contactName:user?.name||'',contactMobile:user?.mobile||'',...(source?.meta||{})
});

export default function PostPage(){
  const token=getUserToken(),user=getUser(),nav=useNavigate(),location=useLocation();
  const resubmit=location.state?.resubmit||null;
  const editOriginal=location.state?.editOriginal||null;
  const source=resubmit||editOriginal;
  const requestedType=new URLSearchParams(location.search).get('type');
  const initialType=source?.type||(typeOptions.some(x=>x.type===requestedType)?requestedType:'post');
  const [plans,setPlans]=useState({});
  const [access,setAccess]=useState(null);
  const [type,setType]=useState(initialType);
  const [planCode,setPlanCode]=useState(resubmit?.planCode||'');
  const [form,setForm]=useState({title:source?.title||'',description:source?.description||'',area:source?.area||user?.village||'',price:source?.price??'',linkUrl:source?.linkUrl||'',endsAt:source?.endsAt?String(source.endsAt).slice(0,10):'',mediaUrl:source?.mediaUrl||'',mediaPublicId:source?.mediaPublicId||'',mediaType:source?.mediaType||'none',meta:initialMeta(source,user)});
  const [loading,setLoading]=useState(false),[uploading,setUploading]=useState(false),[error,setError]=useState('');

  useEffect(()=>{api('/content/plans').then(r=>setPlans(r.plans||{})).catch(e=>setError(e.message))},[]);
  useEffect(()=>{
    if(!['status','post'].includes(type)||resubmit||editOriginal){setAccess(null);return}
    api(`/content/user/publishing-access?type=${type}`,{token}).then(setAccess).catch(e=>setError(e.message));
  },[type,token,resubmit,editOriginal]);
  useEffect(()=>{
    if(resubmit||editOriginal)return;
    if(['status','post'].includes(type)){
      if((access?.free?.remaining||0)>0||access?.activePass){setPlanCode('');return}
      const first=(plans[type]||[]).find(x=>x.billingMode!=='free_quota');setPlanCode(first?.code||'');return;
    }
    setPlanCode(plans[type]?.[0]?.code||'');
  },[type,plans,access,resubmit,editOriginal]);

  const cfg=configs[type];
  const selectedPlan=useMemo(()=>plans[type]?.find(x=>x.code===planCode),[plans,type,planCode]);
  const setMeta=(key,value)=>setForm(v=>({...v,meta:{...v.meta,[key]:value}}));
  const freeRemaining=Number(access?.free?.remaining||0);
  const activePass=access?.activePass||null;
  const useActivePass=Boolean(['status','post'].includes(type)&&freeRemaining<=0&&activePass);
  const needsPlan=!resubmit&&!editOriginal&&!freeRemaining&&!useActivePass;

  const chooseType=(next)=>{setType(next);setAccess(null);setForm(v=>({...v,title:'',description:'',price:'',linkUrl:'',endsAt:'',mediaUrl:'',mediaPublicId:'',mediaType:'none',meta:initialMeta(null,user)}));setError('')};
  const uploadMedia=async(file)=>{if(!file)return;setUploading(true);setError('');try{const fd=new FormData();fd.append('file',file);const endpoint=type==='status'?'/upload/user/short':'/upload/user';const result=await api(endpoint,{token,method:'POST',body:fd});setForm(v=>({...v,mediaUrl:result.url,mediaPublicId:result.publicId,mediaType:result.resourceType==='video'?'video':'image'}))}catch(e){setError(e.message)}finally{setUploading(false)}};

  const missingRequired=cfg.fields.some(f=>f.required&&!String(form.meta[f.key]??'').trim());
  const submitDisabled=loading||uploading||(needsPlan&&!planCode)||!form.title.trim()||!form.description.trim()||!form.area.trim()||missingRequired||(cfg.mediaRequired&&!form.mediaUrl)||(type==='event'&&!form.endsAt)||(type==='vehicle'&&!String(form.price).trim())||(type==='offer'&&!String(form.meta.offerPrice).trim());

  const submit=async(e)=>{e.preventDefault();setLoading(true);setError('');try{
    const topPrice=type==='offer'?form.meta.offerPrice:form.price;
    const payload={type,planCode,useActivePass,title:form.title,description:form.description,area:form.area,price:topPrice,linkUrl:form.linkUrl,endsAt:form.endsAt||undefined,mediaUrl:form.mediaUrl,mediaPublicId:form.mediaPublicId,mediaType:form.mediaType,meta:form.meta};
    if(resubmit){await api(`/content/user/${resubmit._id}/resubmit`,{token,method:'POST',body:JSON.stringify(payload)});nav('/my-submissions',{replace:true});return}
    if(editOriginal){await api(`/content/user/${editOriginal._id}/edit-request`,{token,method:'POST',body:JSON.stringify(payload)});nav('/my-submissions',{replace:true});return}
    const content=await api('/content/user',{token,method:'POST',body:JSON.stringify(payload)});
    if(content.paymentStatus==='paid'&&Number(content.planAmount||0)===0)nav('/my-submissions',{replace:true});
    else nav(`/mock-payment/${content._id}`,{state:{content}});
  }catch(e){setError(e.message)}finally{setLoading(false)}};

  const paidPlans=(plans[type]||[]).filter(p=>p.billingMode!=='free_quota');
  const heading=editOriginal?'Edit Listing — Admin Approval':resubmit?'Update & Resubmit':'Choose what you want to post';
  let actionText='Submit';
  if(editOriginal)actionText=loading?'Sending...':'Send Edit Request — No New Payment';
  else if(resubmit)actionText=loading?'Resubmitting...':'Resubmit — No New Payment';
  else if(freeRemaining>0)actionText=loading?'Saving...':`Submit Free • ${freeRemaining} free remaining`;
  else if(useActivePass)actionText=loading?'Saving...':'Publish Using Active Pack';
  else actionText=loading?'Saving...':`Continue to Mock Payment ₹${Number(selectedPlan?.amount||0).toLocaleString('en-IN')}`;

  return <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 md:pb-10">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black tracking-[.16em] text-blue-600">CREATE</p><h1 className="mt-1 text-3xl font-black">{heading}</h1><p className="mt-1 text-sm text-slate-500">Each category has its own form. Payment is Mock for testing now.</p></div><Link to="/my-submissions" className="rounded-xl border bg-white px-4 py-2.5 text-sm font-extrabold text-blue-600">My Posts / Submissions</Link></div>

    {!resubmit&&!editOriginal&&<div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{typeOptions.map(({type:t,label,sub,Icon})=><button key={t} type="button" onClick={()=>chooseType(t)} className={`rounded-2xl border p-4 text-left transition ${type===t?'border-blue-500 bg-blue-50 ring-2 ring-blue-100':'bg-white hover:border-blue-200'}`}><span className={`grid h-10 w-10 place-items-center rounded-xl ${type===t?'bg-blue-600 text-white':'bg-slate-100 text-slate-600'}`}><Icon size={20}/></span><p className="mt-3 text-sm font-black">{label}</p><p className="mt-1 text-[11px] leading-4 text-slate-500">{sub}</p></button>)}</div>}

    <form onSubmit={submit} className="mt-6 rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 border-b pb-4"><p className="text-xs font-black uppercase tracking-[.16em] text-blue-600">{typeOptions.find(x=>x.type===type)?.label}</p><h2 className="mt-1 text-2xl font-black">{cfg.heading}</h2></div>
      {error&&<p className="mb-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      {editOriginal&&<p className="mb-4 rounded-2xl border border-purple-200 bg-purple-50 p-4 text-sm font-semibold text-purple-800">Your current live listing stays visible. These edits go to Admin Review and replace the live details only after approval. No new payment.</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`${cfg.titleLabel} *`} value={form.title} onChange={v=>setForm({...form,title:v})}/>
        <Field label="Area / Village *" value={form.area} onChange={v=>setForm({...form,area:v})}/>
        <label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-bold">{cfg.descriptionLabel} *</span><textarea required rows="5" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="w-full rounded-xl border bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-400" placeholder={cfg.descriptionPlaceholder}/></label>
        {cfg.fields.map(field=>field.type==='select'?<SelectField key={field.key} label={`${field.label}${field.required?' *':''}`} value={form.meta[field.key]} options={field.options} onChange={v=>setMeta(field.key,v)}/>:<Field key={field.key} label={`${field.label}${field.required?' *':''}`} type={field.type||'text'} value={form.meta[field.key]} onChange={v=>setMeta(field.key,v)} placeholder={field.placeholder||''}/>) }
        {type==='event'&&<Field label="Event End Date *" type="date" value={form.endsAt} onChange={v=>setForm({...form,endsAt:v})}/>} 
        {type==='vehicle'&&<Field label="Selling Price *" type="number" value={form.price} onChange={v=>setForm({...form,price:v})} placeholder="Vehicle price"/>}
        {(type==='banner'||type==='shop')&&<Field label={type==='banner'?'Banner Target Link (optional)':'Website / Google Map Link (optional)'} value={form.linkUrl} onChange={v=>setForm({...form,linkUrl:v})} placeholder="https://..."/>}
        {cfg.showContact&&<><Field label="Contact Name *" value={form.meta.contactName} onChange={v=>setMeta('contactName',v)}/><Field label="Contact Mobile *" value={form.meta.contactMobile} onChange={v=>setMeta('contactMobile',v)}/></>}
      </div>

      <div className="mt-5"><p className="mb-1.5 text-sm font-bold">{cfg.mediaLabel}{cfg.mediaRequired?' *':''}</p><div className="rounded-2xl border border-dashed bg-slate-50 p-4">{form.mediaUrl&&<div className="mb-4 flex items-start gap-3">{form.mediaType==='video'?<video src={form.mediaUrl} controls playsInline className="h-40 w-full max-w-sm rounded-2xl bg-black object-contain"/>:<img src={form.mediaUrl} className="h-32 w-44 rounded-2xl object-cover"/>}<button type="button" onClick={()=>setForm({...form,mediaUrl:'',mediaPublicId:'',mediaType:'none'})} className="rounded-xl border bg-white p-2 text-red-600"><X size={18}/></button></div>}<label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-extrabold ${uploading?'pointer-events-none opacity-60':''}`}><UploadCloud size={18}/>{uploading?'Uploading...':form.mediaUrl?'Change media from device':'Choose from device'}<input type="file" accept={type==='banner'?'image/*':'image/*,video/*'} className="hidden" onChange={e=>{uploadMedia(e.target.files?.[0]);e.target.value=''}}/></label><p className="mt-2 text-xs text-slate-400">{cfg.mediaHelp||'Images and videos are uploaded to Cloudinary. Maximum file size 25 MB.'}</p></div></div>

      {!resubmit&&!editOriginal&&['status','post'].includes(type)&&freeRemaining>0&&<div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm font-black text-emerald-800">Free publishing available</p><p className="mt-1 text-sm text-emerald-700">First {access?.free?.limit||10} approved {type==='status'?'stories':'posts'} are free. You currently have <b>{freeRemaining}</b> free publish slot{freeRemaining===1?'':'s'} remaining.</p></div>}
      {!resubmit&&!editOriginal&&['status','post'].includes(type)&&freeRemaining<=0&&activePass&&<div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4"><p className="text-sm font-black text-blue-800">Active Pack: {activePass.planLabel}</p><p className="mt-1 text-sm text-blue-700">Valid until {new Date(activePass.expiresAt).toLocaleString()}. {activePass.remaining==null?'Unlimited publishes during this period.':`${activePass.remaining} publishes remaining.`}</p></div>}

      {!resubmit&&!editOriginal&&needsPlan&&<div className="mt-5"><p className="mb-2 text-sm font-bold">Choose Plan *</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{paidPlans.map(p=><label key={p.code} className={`cursor-pointer rounded-2xl border p-4 ${planCode===p.code?'border-blue-500 bg-blue-50 ring-2 ring-blue-100':'bg-white'}`}><input type="radio" className="hidden" checked={planCode===p.code} onChange={()=>setPlanCode(p.code)}/><p className="text-sm font-black">{p.label}</p><p className="mt-2 text-2xl font-black text-blue-700">₹{Number(p.amount).toLocaleString('en-IN')}</p>{p.billingMode==='pack'&&<p className="mt-1 text-xs text-slate-500">{p.packValidityDays} day validity • {p.publishLimit==null?'Unlimited':`${p.publishLimit} publishes`}</p>}{p.durationDays&& !['status','post'].includes(type)&&<p className="mt-1 text-xs text-slate-500">Listing live for {p.durationDays} days</p>}{p.durationDays==null&&['shop','worker','post'].includes(type)&&<p className="mt-1 text-xs text-emerald-600">No expiry</p>}</label>)}</div></div>}

      {!resubmit&&!editOriginal&&<div className="mt-6 rounded-2xl bg-blue-50 p-4 text-xs leading-5 text-blue-800"><b>Test flow:</b> {freeRemaining>0?'Free slot → Pending Admin Approval':useActivePass?'Active pack → Pending Admin Approval':`Mock Payment ₹${Number(selectedPlan?.amount||0).toLocaleString('en-IN')} → Pending Admin Approval`}. Post/Business/Worker stay live until you delete them; Story public status stays for 24 hours.</div>}
      <button disabled={submitDisabled} className="mt-5 w-full rounded-2xl bg-blue-600 px-5 py-3.5 font-extrabold text-white shadow-lg shadow-blue-100 disabled:opacity-50">{actionText}</button>
    </form>
  </main>
}

function Field({label,value,onChange,type='text',placeholder=''}){return <label><span className="mb-1.5 block text-sm font-bold">{label}</span><input required={label.includes('*')} type={type} value={value??''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-400"/></label>}
function SelectField({label,value,onChange,options=[]}){return <label><span className="mb-1.5 block text-sm font-bold">{label}</span><select required={label.includes('*')} value={value??''} onChange={e=>onChange(e.target.value)} className="w-full rounded-xl border bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-400"><option value="">Select</option>{options.map(x=><option key={x} value={x}>{x}</option>)}</select></label>}
