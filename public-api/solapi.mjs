import {createHmac,randomBytes} from 'node:crypto';
const fail=(message,status=400)=>Object.assign(Error(message),{status});
export function solapiConfig(env=process.env){return {key:env.SOLAPI_API_KEY||'',secret:env.SOLAPI_API_SECRET||'',from:(env.SOLAPI_SENDER_NUMBER||'').replace(/[ -]/g,''),origin:env.ONWAY_PUBLIC_ORIGIN||''};}
export function solapiReady(c){try{const u=new URL(c.origin);return !!(c.key&&c.secret&&/^0[0-9]{8,10}$/.test(c.from)&&u.protocol==='https:'&&!u.username&&!u.password&&u.pathname==='/'&&!u.search&&!u.hash&&!['localhost','127.0.0.1'].includes(u.hostname))}catch{return false}}
export function normalizeRecipient(value){const phone=typeof value==='string'?value.replace(/[ -]/g,''):'';if(!/^010[0-9]{8}$/.test(phone))throw fail('받는 분 휴대폰 번호를 010으로 시작하는 11자리로 입력해주세요.');return phone;}
export function validateQr(image){if(typeof image!=='string'||image.length>275000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(image))throw fail('QR 이미지를 다시 생성해주세요.');const raw=image.split(',')[1],b=Buffer.from(raw,'base64');if(b.length>200000||b[0]!==255||b[1]!==216||b.at(-2)!==255||b.at(-1)!==217)throw fail('QR 이미지는 200KB 이하 JPG여야 합니다.');return raw;}
export function solapiAuthorization(c,date=new Date().toISOString(),salt=randomBytes(16).toString('hex')){return 'HMAC-SHA256 apiKey='+c.key+', date='+date+', salt='+salt+', signature='+createHmac('sha256',c.secret).update(date+salt).digest('hex');}
export async function sendSolapi({config,to,text,image,requestId},fetcher=fetch){
 if(!solapiReady(config))throw fail('솔라피 서버 설정이 아직 완료되지 않았어요.',503);
 to=normalizeRecipient(to);const file=validateQr(image);
 async function post(endpoint,body){let r,d;try{r=await fetcher('https://api.solapi.com'+endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:solapiAuthorization(config)},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});d=await r.json()}catch{throw fail('발송 결과를 확인하지 못했어요. 중복 전송하지 말고 솔라피 발송 내역을 확인해주세요.',502)}if(!r.ok)throw fail('솔라피 요청이 거절됐어요. API 권한·발신번호 인증·잔액을 솔라피에서 확인해주세요.',502);return d;}
 const uploaded=await post('/storage/v1/files',{file,type:'MMS',name:'ONWAY-guide-QR.jpg'});
 if(!uploaded.fileId)throw fail('QR 이미지 업로드 결과를 확인하지 못했어요.',502);
 const result=await post('/messages/v4/send-many/detail',{messages:[{to,from:config.from,text,type:'MMS',subject:'국립청소년우주센터 ON:WAY 안내',imageId:uploaded.fileId,customFields:{onwayRequestId:requestId}}],allowDuplicates:false});
 if(result.failedMessageList?.length||!(result.groupInfo?.count?.registeredSuccess>=1))throw fail('문자 접수가 확인되지 않았어요. 솔라피 발송 내역에서 사유를 확인해주세요.',502);
 return {accepted:true,groupId:result.groupInfo.groupId};
}
