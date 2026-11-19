import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
export function encodeCenterCode(code){
 if(typeof code!=='string'||code.length<10||code.length>128||!code.trim())throw Object.assign(Error('센터 코드는 10~128자로 입력해주세요.'),{status:400});
 const salt=randomBytes(16).toString('hex');return {salt,digest:scryptSync(code,salt,32).toString('hex'),version:randomBytes(16).toString('hex')};
}
export function checkCenterCode(code,record){
 if(typeof code!=='string'||code.length>128||!record?.salt||!record?.digest)return false;
 const actual=scryptSync(code,record.salt,32),expected=Buffer.from(record.digest,'hex');return expected.length===actual.length&&timingSafeEqual(actual,expected);
}
