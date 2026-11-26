import {randomUUID,createHash} from 'node:crypto';
import {CHAT_FILE_LIMIT,validChatAttachment} from './chat-attachment-schema.mjs';
export {CHAT_FILE_LIMIT,validChatAttachment};
const fail=(message,status=400)=>Object.assign(Error(message),{status});
const mime={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',pdf:'application/pdf',txt:'text/plain',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',hwp:'application/octet-stream',hwpx:'application/octet-stream'};
export const chatFileKey=id=>createHash('sha256').update('chat-attachment:'+id).digest('hex');

export async function validateChatAttachments(before,after,store,actor){
 for(const group of after.groups)for(const message of group.state.centerMessages??[]){
  const old=before.groups.find(g=>g.id===group.id)?.state.centerMessages?.find(m=>m.id===message.id);
  if(old){if(JSON.stringify(old.attachment)!==JSON.stringify(message.attachment))throw fail('전송된 첨부파일은 변경할 수 없어요.',403);continue}
  if(!message.attachment)continue;
  if(!validChatAttachment(message.attachment)||!store)throw fail('첨부파일 정보를 확인해주세요.');
  const record=await store.read(chatFileKey(message.attachment.id));
  if(!record||record.groupId!==group.id||record.sender!==actor.role||record.sender!==(message.sender??'guide')||JSON.stringify(record.attachment)!==JSON.stringify(message.attachment))throw fail('이 첨부파일을 전송할 권한이 없어요.',403);
 }
}
export async function serveChatAttachments(req,res,url,{store,actor,groups}){
 if(!store)throw fail('첨부파일 저장소에 연결되지 않았어요.',503);
 const groupId=url.searchParams.get('groupId'),group=groups.find(g=>g.id===groupId);
 if(!group||(actor.role!=='admin'&&actor.groupId!==groupId))throw fail('이 단체의 파일을 열 수 없어요.',403);
 if(req.method==='POST'){
  const name=url.searchParams.get('name')??'',ext=name.split('.').at(-1).toLowerCase();
  if(!name||name.length>180||/[\x00-\x1f/\\]/.test(name)||!mime[ext])throw fail('사진(PNG·JPG·WEBP), PDF, 한글, Word, Excel, TXT 파일을 선택해주세요.');
  if(Number(req.headers['content-length'])>CHAT_FILE_LIMIT)throw fail('파일은 5MB까지 첨부할 수 있어요.',413);
  let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>CHAT_FILE_LIMIT)throw fail('파일은 5MB까지 첨부할 수 있어요.',413);chunks.push(Buffer.from(chunk))}
  const bytes=Buffer.concat(chunks);
  const matches=ext==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):['jpg','jpeg'].includes(ext)?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:ext==='webp'?bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP':ext==='pdf'?bytes.toString('ascii',0,5)==='%PDF-':['docx','xlsx','hwpx'].includes(ext)?bytes[0]===80&&bytes[1]===75&&bytes[2]===3&&bytes[3]===4:ext==='hwp'?bytes.subarray(0,8).equals(Buffer.from([208,207,17,224,161,177,26,225])):true;
  if(!size||!matches)throw fail('파일 형식이 올바르지 않아요. 원본 파일을 선택해주세요.');
  const attachment={id:randomUUID(),name,mime:mime[ext],size};
  await store.write(chatFileKey(attachment.id),{groupId,sender:actor.role,attachment,data:bytes.toString('base64')});
  res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({attachment}));return;
 }
 if(req.method!=='GET')throw fail('허용되지 않은 요청이에요.',405);
 const id=url.searchParams.get('id');
 const message=(group.state.centerMessages??[]).find(m=>m.attachment?.id===id&&!m.cancelledAt);
 if(!message)throw fail('첨부파일이 없거나 전송이 취소됐어요.',404);
 const record=await store.read(chatFileKey(id));if(!record||record.groupId!==groupId)throw fail('파일을 찾지 못했어요.',404);
 const bytes=Buffer.from(record.data,'base64'),a=record.attachment;
 res.writeHead(200,{'Content-Type':a.mime,'Content-Length':bytes.length,'Content-Disposition':"attachment; filename=\"attachment\"; filename*=UTF-8''"+encodeURIComponent(a.name),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':'sandbox'});res.end(bytes);
}
