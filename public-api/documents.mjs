import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
export const PDF_LIMIT=10*1024*1024;
const fail=(message,status=400)=>Object.assign(Error(message),{status});
export const documentKey=(groupId,date,kind)=>createHash('sha256').update(JSON.stringify([groupId,date,kind])).digest('hex');
export function createFileDocumentStore(directory){
 return {
  async read(key){try{return JSON.parse(await fs.readFile(path.join(directory,key+'.json'),'utf8'))}catch(e){if(e.code==='ENOENT')return null;throw e}},
  async write(key,value){await fs.mkdir(directory,{recursive:true,mode:0o700});const target=path.join(directory,key+'.json'),temp=target+'.'+randomUUID()+'.tmp';try{await fs.writeFile(temp,JSON.stringify(value),{mode:0o600});await fs.rename(temp,target)}finally{await fs.rm(temp,{force:true})}}
 };
}
export function createCloudDocumentStore({url,key,fetchImpl=fetch}){
 const base=new URL('/storage/v1/',url),bucket='onway-documents';
 const headers={apikey:key,...(!key.startsWith('sb_secret_')?{Authorization:'Bearer '+key}:{})};let ready=false;
 async function call(route,options={}){try{return await fetchImpl(new URL(route,base),{...options,headers:{...headers,...options.headers},signal:AbortSignal.timeout(30000),redirect:'error'})}catch{throw fail('PDF 저장소에 연결하지 못했어요. 다시 시도해주세요.',503)}}
 async function ensure(){if(ready)return;let r=await call('bucket/'+bucket);if(r.ok){const b=await r.json();if(b.public)throw fail('PDF 저장소를 비공개로 설정해야 합니다.',503);ready=true;return;}if(![400,404].includes(r.status))throw fail('PDF 저장소를 확인하지 못했어요.',503);r=await call('bucket',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:bucket,name:bucket,public:false,file_size_limit:15*1024*1024,allowed_mime_types:['application/json']})});if(!r.ok)throw fail('PDF 저장소를 준비하지 못했어요. 관리자에게 문의해주세요.',503);ready=true;}
 return {
  async read(id){const r=await call('object/authenticated/'+bucket+'/'+id+'.json');if(r.ok)return r.json();if([400,404].includes(r.status)){const e=await r.json().catch(()=>({}));if(['404','NoSuchKey','NoSuchBucket'].includes(String(e.statusCode??e.code))||/not found|does not exist/i.test(e.message??e.error??''))return null;}throw fail('등록된 PDF를 불러오지 못했어요.',503)},
  async write(id,value){await ensure();const r=await call('object/'+bucket+'/'+id+'.json',{method:'POST',headers:{'Content-Type':'application/json','x-upsert':'true'},body:JSON.stringify(value)});if(!r.ok)throw fail('PDF를 저장하지 못했어요. 기존 자료는 유지됩니다.',503)}
 };
}
export async function serveDocuments(req,res,url,{store,canEdit,authorize}){
 const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value))};
 try{
  const groupId=url.searchParams.get('groupId'),date=url.searchParams.get('date'),kind=url.searchParams.get('kind');
  if(!groupId||groupId.length>200||!/^\d{4}-\d{2}-\d{2}$/.test(date??''))throw fail('단체와 입소 일정을 확인해주세요.');
  if(authorize&&!authorize(groupId,date))throw fail('이 단체의 자료를 조회할 권한이 없어요.',403);
  if(!['GET','POST','DELETE'].includes(req.method))throw fail('허용되지 않은 요청이에요.',405);
  if(req.method!=='GET'&&!canEdit)throw fail('관리자만 PDF를 등록하거나 삭제할 수 있어요.',403);
  const meta=r=>r?{name:r.name,size:r.size,updatedAt:r.updatedAt}:null;
  if(req.method==='GET'&&!kind){const [schedule,menu]=await Promise.all(['schedule','menu'].map(k=>store.read(documentKey(groupId,date,k))));json(200,{documents:{schedule:meta(schedule),menu:meta(menu)}});return;}
  if(!['schedule','menu'].includes(kind))throw fail('자료 종류를 확인해주세요.');
  const id=documentKey(groupId,date,kind);
  if(req.method==='POST'){
   const name=url.searchParams.get('name')??'';
   if(!name||name.length>180||!name.toLowerCase().endsWith('.pdf')||/[\x00-\x1f\/\\]/.test(name))throw fail('PDF 파일 이름을 확인해주세요.');
   if((req.headers['content-type']??'').split(';')[0]!=='application/pdf')throw fail('PDF 파일만 등록할 수 있어요.');
   if(Number(req.headers['content-length'])>PDF_LIMIT)throw fail('PDF는 파일당 10MB까지 등록할 수 있어요.',413);
   let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>PDF_LIMIT)throw fail('PDF는 파일당 10MB까지 등록할 수 있어요.',413);chunks.push(Buffer.from(chunk));}
   const bytes=Buffer.concat(chunks);if(bytes.subarray(0,5).toString()!=='%PDF-'||!bytes.subarray(-2048).includes(Buffer.from('%%EOF')))throw fail('올바른 PDF 파일이 아니에요.');
   const record={name,size,updatedAt:new Date().toISOString(),data:bytes.toString('base64')};await store.write(id,record);json(200,meta(record));return;
  }
  if(req.method==='DELETE'){await store.write(id,null);json(200,{deleted:true});return;}
  const record=await store.read(id);if(!record)throw fail('아직 등록된 PDF가 없어요.',404);
  const bytes=Buffer.from(record.data,'base64');res.writeHead(200,{'Content-Type':'application/pdf','Content-Length':bytes.length,'Content-Disposition':"inline; filename=\"document.pdf\"; filename*=UTF-8''"+encodeURIComponent(record.name),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox"});res.end(bytes);
 }catch(e){json(e.status??500,{error:e.status?e.message:'PDF를 처리하지 못했어요. 다시 시도해주세요.'})}
}
export function createLocalDocumentHandler(store){return async(req,res,url)=>{
 if(url.pathname!=='/api/local-documents')return false;
 const host=(req.headers.host??'').split(':')[0],origin=req.headers.origin;
 if(!['localhost','127.0.0.1'].includes(host)||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket?.remoteAddress)||(origin&&new URL(origin).host!==req.headers.host)||req.headers['sec-fetch-site']==='cross-site'){
  res.writeHead(403);res.end();return true;
 }
 await serveDocuments(req,res,url,{store,canEdit:true});return true;
}}
