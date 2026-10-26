import type {StorageLike} from './workspace';

export class LocalWorkspaceConflict extends Error {
 constructor(){super('다른 화면에서 자료가 변경됐어요. 입력 내용은 보관했습니다. 백업한 뒤 저장된 자료를 다시 불러와주세요.');this.name='LocalWorkspaceConflict';}
}

export function writeIfUnchanged(storage:StorageLike,key:string,expected:string|null,next:string){
 if(storage.getItem(key)!==expected)throw new LocalWorkspaceConflict();
 storage.setItem(key,next);
 return next;
}

// A short IndexedDB readwrite transaction serializes localStorage writes across
// tabs, including embedded browsers without Web Locks. The workspace stays in
// its existing localStorage key; this database contains no workspace data.
export function saveLocalSnapshot(storage:StorageLike,key:string,expected:string|null,next:string):Promise<string>{
 return new Promise((resolve,reject)=>{
  let database:IDBDatabase|undefined,transaction:IDBTransaction|undefined;
  let finished=false,written=false,failure:unknown;
  const finish=(error?:unknown)=>{
   if(finished)return;finished=true;clearTimeout(timer);database?.close();
   // localStorage writes are atomic and cannot be rolled back by IndexedDB.
   if(written)resolve(next);else reject(error??Error('저장 보호 기능을 시작하지 못했어요. 입력 내용은 보관했습니다.'));
  };
  const timer=setTimeout(()=>{failure=Error('저장 응답이 지연됐어요. 입력 내용은 보관했습니다. 다시 저장해주세요.');try{transaction?.abort()}catch{}finish(failure)},5000);
  try{
   const opening=indexedDB.open('onway-local-write-coordination',1);
   opening.onupgradeneeded=()=>{opening.result.createObjectStore('writes')};
   opening.onerror=()=>finish(opening.error);
   opening.onblocked=()=>finish(Error('저장 보호 기능이 다른 화면에서 준비 중이에요. 잠시 후 다시 저장해주세요.'));
   opening.onsuccess=()=>{
    database=opening.result;
    if(finished){database.close();return}
    database.onversionchange=()=>database?.close();
    try{
     transaction=database.transaction('writes','readwrite');
     transaction.oncomplete=()=>finish(failure);
     transaction.onabort=()=>finish(failure??transaction?.error);
     transaction.onerror=()=>{failure??=transaction?.error};
     const request=transaction.objectStore('writes').get(key);
     request.onsuccess=()=>{
      if(finished)return;
      try{writeIfUnchanged(storage,key,expected,next);written=true}
      catch(error){failure=error;transaction?.abort()}
     };
    }catch(error){finish(error)}
   };
  }catch(error){finish(error)}
 });
}
