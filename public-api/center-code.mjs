import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
export function encodeCenterCode(code){
 if(typeof code!=='string'||code.length<10||code.length>128||!code.trim())throw Object.assign(Error('센터 코드는 10~128자로 입력해주세요.'),{status:400});
 const salt=randomBytes(16).toString('hex');return {salt,digest:scryptSync(code,salt,32).toString('hex'),version:randomBytes(16).toString('hex')};
}
export function checkCenterCode(code,record){
 if(typeof code!=='string'||code.length>128||!record?.salt||!record?.digest)return false;
 const actual=scryptSync(code,record.salt,32),expected=Buffer.from(record.digest,'hex');return expected.length===actual.length&&timingSafeEqual(actual,expected);
}

// Server-only bootstrap. Never include this credential record in demo snapshots.
export async function initializeCenterCode(store,encoded){
 if(!encoded)return null;
 if(!store)throw Error('Center code initialization requires protected storage');
 if(encoded.length>2048)throw Error('Invalid center code initialization record');
 const input=JSON.parse(Buffer.from(encoded,'base64').toString('utf8'));
 if(!/^[a-f0-9]{32}$/.test(input?.salt??'')||!/^[a-f0-9]{64}$/.test(input?.digest??'')||!/^[a-f0-9]{32}$/.test(input?.version??''))throw Error('Invalid center code initialization record');
 const db=await store.load();
 if(db.centerCode)return {status:'already-configured'};
 const centerCode={salt:input.salt,digest:input.digest,version:input.version};
 await store.save({...db,revision:db.revision+1,centerCode},db.revision);
 const saved=await store.load();
 if(JSON.stringify(saved.centerCode)!==JSON.stringify(centerCode))throw Error('Center code initialization verification failed');
 return {status:'initialized'};
}
