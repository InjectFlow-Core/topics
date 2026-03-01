const crypto = require('crypto');
const webcrypto = crypto.webcrypto;
const subtle = webcrypto.subtle;
const enc = new TextEncoder();
const b64 = (buf) => Buffer.from(buf).toString('base64');
async function deriveKey(pass, salt, iter){
  const keyMat = await subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey({name:'PBKDF2', salt, iterations:iter, hash:'SHA-256'}, keyMat, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
}
async function encrypt(pass, marker='KABAN_AUTH_OK', iter=120000){
  const salt = new Uint8Array(16); webcrypto.getRandomValues(salt);
  const iv = new Uint8Array(12); webcrypto.getRandomValues(iv);
  const key = await deriveKey(pass, salt, iter);
  const ct = await subtle.encrypt({name:'AES-GCM', iv}, key, enc.encode(marker));
  return { iter, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
}
(async()=>{
  for (const pass of ['NotAllowed@123','Allowed@123']){
    console.log('Pass:', pass);
    for (let i=0;i<3;i++){
      const r = await encrypt(pass);
      console.log('v1:' + r.iter + ':' + r.salt + ':' + r.iv + ':' + r.ct);
    }
  }
})();
