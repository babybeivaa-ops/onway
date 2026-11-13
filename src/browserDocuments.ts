type Kind='schedule'|'menu';
type RecordInfo={name:string;size:number;updatedAt:string;blob:Blob};
type Bundle={schedule:RecordInfo|null;menu:RecordInfo|null};
const key=(groupId:string,date:string)=>JSON.stringify([groupId,date]);
async function database():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open('onway-local-documents',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('documents');
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(Error('브라우저 저장소를 열지 못했어요. 저장 권한을 확인해주세요.'));
  request.onblocked=()=>reject(Error('다른 ON:WAY 창을 닫고 다시 시도해주세요.'));
 });
}
async function transact<T>(id:string,update?:(value:Bundle)=>{value:Bundle;result:T}):Promise<T|Bundle|undefined>{
 const db=await database();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('documents',update?'readwrite':'readonly'),store=tx.objectStore('documents');let result:T|Bundle|undefined;
  tx.oncomplete=()=>{db.close();resolve(result)};
  tx.onabort=tx.onerror=()=>{db.close();reject(tx.error??Error('PDF를 저장하지 못했어요. 브라우저 저장 공간을 확인해주세요.'))};
  const request=store.get(id);
  request.onsuccess=()=>{if(update){const next=update(request.result??{schedule:null,menu:null});result=next.result;store.put(next.value,id)}else result=request.result};
 });
}
export async function hasBrowserDocuments(groupId:string,date:string){return !!await transact(key(groupId,date))}
export async function browserDocumentRequest(groupId:string,date:string,kind?:Kind,options:RequestInit={},name?:string):Promise<Response>{
 const id=key(groupId,date),method=options.method??'GET';
 const metadata=(record:RecordInfo|null)=>record?{name:record.name,size:record.size,updatedAt:record.updatedAt}:null;
 if(method==='GET'){
  const bundle=await transact<Bundle>(id) as Bundle|undefined;
  if(!kind)return Response.json({documents:{schedule:metadata(bundle?.schedule??null),menu:metadata(bundle?.menu??null)}});
  const record=bundle?.[kind];if(!record)return Response.json({error:'아직 등록된 PDF가 없어요.'},{status:404});
  return new Response(record.blob,{headers:{'Content-Type':'application/pdf'}});
 }
 if(!kind)throw Error('자료 종류를 확인해주세요.');
 if(method==='DELETE'){await transact(id,bundle=>({value:{...bundle,[kind]:null},result:true}));return Response.json({deleted:true})}
 if(method!=='POST'||!(options.body instanceof Blob))throw Error('PDF 파일을 선택해주세요.');
 const blob=options.body;
 if(!name||name.length>180||!name.toLowerCase().endsWith('.pdf')||/[\x00-\x1f/\\]/.test(name))throw Error('PDF 파일 이름을 확인해주세요.');
 if(blob.size>10*1024*1024)throw Error('PDF는 파일당 10MB까지 등록할 수 있어요.');
 if(await blob.slice(0,5).text()!=='%PDF-'||!(await blob.slice(-2048).text()).includes('%%EOF'))throw Error('올바른 PDF 파일이 아니에요.');
 const record={name,size:blob.size,updatedAt:new Date().toISOString(),blob};
 await transact(id,bundle=>({value:{...bundle,[kind]:record},result:true}));
 return Response.json(metadata(record));
}
