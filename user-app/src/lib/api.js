export const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export async function api(path,{token,headers,...options}={}){
  const res=await fetch(`${API}${path}`,{
    ...options,
    headers:{
      ...(options.body && !(options.body instanceof FormData) ? {'Content-Type':'application/json'} : {}),
      ...(token?{Authorization:`Bearer ${token}`}:{ }),
      ...headers
    }
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.message||`Request failed (${res.status})`);
  return data;
}
