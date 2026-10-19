export const API=import.meta.env.VITE_API_BASE_URL||'http://localhost:5000/api';
export const adminToken=()=>localStorage.getItem('nm_admin_token');
export async function adminApi(path,{headers,...options}={}){const token=adminToken();const res=await fetch(`${API}${path}`,{...options,headers:{...(options.body && !(options.body instanceof FormData)?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{ }),...headers}});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.message||`Request failed (${res.status})`);return data}
