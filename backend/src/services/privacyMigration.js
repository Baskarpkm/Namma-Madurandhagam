import User from '../models/User.js';
import Content from '../models/Content.js';
import { protectMobile } from './privacyCrypto.js';

async function dropLegacyPlaintextMobileIndex(){
  const indexes=await User.collection.indexes().catch(()=>[]);
  const legacy=indexes.find(index=>index?.key&&Object.keys(index.key).length===1&&index.key.mobile===1);
  if(legacy?.name){
    await User.collection.dropIndex(legacy.name).catch(error=>{
      if(error?.codeName!=='IndexNotFound')throw error;
    });
  }
}

export async function migrateLegacyPlaintextMobiles(){
  // The old schema used a unique non-sparse `mobile` index. It must be removed
  // before clearing plaintext values, otherwise multiple missing values can collide.
  await dropLegacyPlaintextMobileIndex();

  const rows=await User.find({mobile:{$exists:true,$nin:[null,'']}}).select('+mobile +mobileEncrypted +mobileHash mobileLast4').limit(5000);
  let migrated=0;
  for(const user of rows){
    const mobile=String(user.mobile||'').replace(/\D/g,'').slice(-10);
    if(mobile.length===10){
      const protectedMobile=protectMobile(mobile);
      user.mobileEncrypted=protectedMobile.mobileEncrypted;
      user.mobileHash=protectedMobile.mobileHash;
      user.mobileLast4=protectedMobile.mobileLast4;
      await user.save();
      await User.collection.updateOne({_id:user._id},{$unset:{mobile:''}});
      migrated++;
    }
  }
  if(migrated)console.log(`Privacy migration: encrypted ${migrated} legacy mobile number(s).`);
  return migrated;
}

export async function migrateLegacyContentContacts(){
  const rows=await Content.find({
    $or:[{'meta.contactMobile':{$exists:true,$nin:[null,'']}},{'meta.whatsapp':{$exists:true,$nin:[null,'']}}]
  }).select('+contactEncrypted +contactHash +whatsappEncrypted +whatsappHash').limit(10000);
  let migrated=0;
  for(const item of rows){
    // Content's save hook encrypts these private fields and removes public plaintext meta keys.
    await item.save();
    migrated++;
  }
  if(migrated)console.log(`Privacy migration: protected contact data in ${migrated} content item(s).`);
  return migrated;
}
