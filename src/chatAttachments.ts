import type {ChatAttachment} from './types';
export const chatFileAccept='.png,.jpg,.jpeg,.webp,.pdf,.docx,.xlsx,.hwp,.hwpx,.txt';
export function checkChatFile(file:File){if(!/\.(png|jpe?g|webp|pdf|docx|xlsx|hwpx?|txt)$/i.test(file.name))throw Error('사진, PDF, 한글, Word, Excel, TXT 파일을 선택해주세요.');if(!file.size||file.size>5*1024*1024)throw Error('파일은 5MB까지 첨부할 수 있어요.')}
async function localFiles(){return new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('onway-chat-files-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('files');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(Error('첨부파일 저장 공간을 열지 못했어요.'))})}
export async function uploadChatFile(file:File,groupId:string,token?:string,signal?:AbortSignal):Promise<ChatAttachment>{
 checkChatFile(file);
 if(token){const r=await fetch('/api/shared/chat-attachments?'+new URLSearchParams({groupId,name:file.name}),{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/octet-stream'},body:file,signal:signal?AbortSignal.any([signal,AbortSignal.timeout(60000)]):AbortSignal.timeout(60000)});const data=await r.json();if(!r.ok)throw Error(data.error||'첨부파일을 저장하지 못했어요.');return data.attachment}
 const types:Record<string,string>={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',pdf:'application/pdf',txt:'text/plain',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
 const mime=types[file.name.split('.').at(-1)!.toLowerCase()]??'application/octet-stream';
 const attachment={id:crypto.randomUUID(),name:file.name,mime,size:file.size},db=await localFiles();
 try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put({groupId,file},attachment.id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(Error('첨부파일을 저장하지 못했어요.'))})}finally{db.close()}
 return attachment;
}
export async function downloadChatFile(attachment:ChatAttachment,groupId:string,token?:string):Promise<Blob>{
 if(token){const r=await fetch('/api/shared/chat-attachments?'+new URLSearchParams({groupId,id:attachment.id}),{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error((await r.json()).error||'파일을 열지 못했어요.');return r.blob()}
 const db=await localFiles();try{return await new Promise<Blob>((resolve,reject)=>{const req=db.transaction('files').objectStore('files').get(attachment.id);req.onsuccess=()=>req.result?.groupId===groupId?resolve(req.result.file):reject(Error('이 브라우저에 첨부파일이 없어요.'));req.onerror=()=>reject(Error('파일을 열지 못했어요.'))})}finally{db.close()}
}
