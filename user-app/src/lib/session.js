const TOKEN='nm_user_token';
const USER='nm_user_profile';
export const getUserToken=()=>localStorage.getItem(TOKEN);
export const getUser=()=>{try{return JSON.parse(localStorage.getItem(USER)||'null')}catch{return null}};
export const saveUserSession=(token,user)=>{if(token)localStorage.setItem(TOKEN,token);localStorage.setItem(USER,JSON.stringify(user));};
export const updateStoredUser=(user)=>localStorage.setItem(USER,JSON.stringify(user));
export const clearUserSession=()=>{localStorage.removeItem(TOKEN);localStorage.removeItem(USER);};
