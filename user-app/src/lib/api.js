export const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const memoryCache=new Map();
const inflight=new Map();
const CACHE_PREFIX='nm_api_cache:';
const CACHE_TTL=45*1000;

function keyFor(path,token){return `${path}|${token?'auth':'public'}`}
function storageKey(key){return `${CACHE_PREFIX}${encodeURIComponent(key)}`}
function readStored(key){
  try{
    const raw=sessionStorage.getItem(storageKey(key));
    if(!raw)return null;
    const parsed=JSON.parse(raw);
    if(!parsed?.ts||Date.now()-parsed.ts>CACHE_TTL)return null;
    return parsed.data;
  }catch{return null}
}
function writeStored(key,data){
  try{sessionStorage.setItem(storageKey(key),JSON.stringify({ts:Date.now(),data}))}catch{}
}
function clearGetCache(){
  memoryCache.clear();
  inflight.clear();
  try{Object.keys(sessionStorage).filter(k=>k.startsWith(CACHE_PREFIX)).forEach(k=>sessionStorage.removeItem(k))}catch{}
}
function normalize(path,data){
  if(path==='/content/user/mine'&&Array.isArray(data))return data.filter(item=>item?.type!=='status');
  return data;
}

export async function api(path,{token,headers,fresh=false,...options}={}){
  const method=String(options.method||'GET').toUpperCase();
  const useCache=method==='GET'&&!fresh;
  const key=keyFor(path,token);

  if(useCache){
    const mem=memoryCache.get(key);
    if(mem&&Date.now()-mem.ts<CACHE_TTL)return mem.data;
    const stored=readStored(key);
    if(stored!==null){memoryCache.set(key,{ts:Date.now(),data:stored});return stored}
    if(inflight.has(key))return inflight.get(key);
  }else if(method!=='GET'){
    clearGetCache();
  }

  const request=fetch(`${API}${path}`,{
    ...options,
    cache:fresh?'no-store':options.cache,
    headers:{
      ...(options.body && !(options.body instanceof FormData) ? {'Content-Type':'application/json'} : {}),
      ...(token?{Authorization:`Bearer ${token}`}:{ }),
      ...headers
    }
  }).then(async res=>{
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.message||`Request failed (${res.status})`);
    const normalized=normalize(path,data);
    if(useCache){memoryCache.set(key,{ts:Date.now(),data:normalized});writeStored(key,normalized)}
    return normalized;
  }).finally(()=>{if(useCache)inflight.delete(key)});

  if(useCache)inflight.set(key,request);
  return request;
}

export async function prefetchHomeData(token){
  await Promise.allSettled([
    api('/content?type=banner',{token}),
    api('/content?type=status',{token}),
    api('/content?type=post',{token}),
    api('/content?type=offer',{token}),
    api('/content?type=worker',{token}),
    api('/content?type=category',{token})
  ]);
}

export function resetApiCache(){clearGetCache()}
