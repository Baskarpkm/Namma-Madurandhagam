import { getUser } from './session';

const PREFIX='nm_seen_story_ids_';

function storageKey(){
  const user=getUser();
  return `${PREFIX}${user?.id||user?._id||user?.mobile||'guest'}`;
}

export function getSeenStoryIds(){
  try{
    const raw=JSON.parse(localStorage.getItem(storageKey())||'[]');
    return new Set(Array.isArray(raw)?raw:[]);
  }catch{return new Set()}
}

export function markStorySeen(id){
  if(!id)return;
  try{
    const seen=getSeenStoryIds();
    seen.add(String(id));
    const values=Array.from(seen).slice(-500);
    localStorage.setItem(storageKey(),JSON.stringify(values));
  }catch{}
}

export function firstUnseenStory(stories=[]){
  const seen=getSeenStoryIds();
  return stories.find(story=>!seen.has(String(story._id)))||stories[0]||null;
}
