const TOKEN='nm_user_token';
const USER='nm_user_profile';
const WELCOME='nm_show_welcome';
const API_CACHE_PREFIX='nm_api_cache:';

function clearApiCache(){
  try{
    Object.keys(sessionStorage).filter(k=>k.startsWith(API_CACHE_PREFIX)).forEach(k=>sessionStorage.removeItem(k));
  }catch{}
}

export const getUserToken=()=>localStorage.getItem(TOKEN);
export const getUser=()=>{try{return JSON.parse(localStorage.getItem(USER)||'null')}catch{return null}};
export const saveUserSession=(token,user)=>{
  clearApiCache();
  if(token)localStorage.setItem(TOKEN,token);
  localStorage.setItem(USER,JSON.stringify(user));
  try{sessionStorage.setItem(WELCOME,'1')}catch{}
};
export const updateStoredUser=(user)=>localStorage.setItem(USER,JSON.stringify(user));
export const shouldShowWelcome=()=>{try{return sessionStorage.getItem(WELCOME)==='1'}catch{return false}};
export const clearWelcomeFlag=()=>{try{sessionStorage.removeItem(WELCOME)}catch{}};
export const clearUserSession=()=>{
  localStorage.removeItem(TOKEN);
  localStorage.removeItem(USER);
  clearApiCache();
  try{sessionStorage.removeItem(WELCOME)}catch{}
};
