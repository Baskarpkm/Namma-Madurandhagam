import crypto from 'crypto';

const normalizeMobile=value=>String(value||'').replace(/\D/g,'').slice(-10);

function encryptionKey(){
  const raw=String(process.env.DATA_ENCRYPTION_KEY||process.env.JWT_SECRET||'').trim();
  if(!raw)throw new Error('DATA_ENCRYPTION_KEY is not configured');
  if(/^[0-9a-f]{64}$/i.test(raw))return Buffer.from(raw,'hex');
  return crypto.createHash('sha256').update(raw).digest();
}

function hashKey(){
  const raw=String(process.env.PHONE_HASH_KEY||process.env.DATA_ENCRYPTION_KEY||process.env.JWT_SECRET||'').trim();
  if(!raw)throw new Error('PHONE_HASH_KEY is not configured');
  return raw;
}

export function encryptText(value){
  const text=String(value??'');
  if(!text)return '';
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',encryptionKey(),iv);
  const ciphertext=Buffer.concat([cipher.update(text,'utf8'),cipher.final()]);
  const tag=cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString('base64url')}`;
}

export function decryptText(value){
  const raw=String(value||'');
  if(!raw)return '';
  const [version,ivB64,tagB64,dataB64]=raw.split('.');
  if(version!=='v1'||!ivB64||!tagB64||!dataB64)throw new Error('Invalid encrypted payload');
  const decipher=crypto.createDecipheriv('aes-256-gcm',encryptionKey(),Buffer.from(ivB64,'base64url'));
  decipher.setAuthTag(Buffer.from(tagB64,'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64,'base64url')),decipher.final()]).toString('utf8');
}

export function mobileLookupHash(value){
  const mobile=normalizeMobile(value);
  if(mobile.length!==10)return '';
  return crypto.createHmac('sha256',hashKey()).update(`mobile:${mobile}`).digest('hex');
}

export function protectMobile(value){
  const mobile=normalizeMobile(value);
  if(mobile.length!==10)throw new Error('Enter a valid 10 digit mobile number');
  return {
    mobileEncrypted:encryptText(mobile),
    mobileHash:mobileLookupHash(mobile),
    mobileLast4:mobile.slice(-4)
  };
}

export function maskLast4(last4){
  const clean=String(last4||'').replace(/\D/g,'').slice(-4);
  return clean?`******${clean}`:'';
}

export { normalizeMobile };
