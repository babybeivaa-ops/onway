import test from 'node:test';
import assert from 'node:assert/strict';
import {writeIfUnchanged,LocalWorkspaceConflict} from '../src/localWorkspaceSave.ts';

test('saving preserves the existing key and accepts an unchanged snapshot',()=>{
 const values=new Map([['workspace','original'],['unrelated','keep']]);
 const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v)}};
 assert.equal(writeIfUnchanged(storage,'workspace','original','updated'),'updated');
 assert.equal(values.get('workspace'),'updated');assert.equal(values.get('unrelated'),'keep');
});
test('a stale editor cannot overwrite newer data or recreate a removed snapshot',()=>{
 const values=new Map([['workspace','newer']]);let writes=0;
 const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{writes++;values.set(k,v)}};
 assert.throws(()=>writeIfUnchanged(storage,'workspace','older','stale'),LocalWorkspaceConflict);
 values.delete('workspace');
 assert.throws(()=>writeIfUnchanged(storage,'workspace','older','stale'),LocalWorkspaceConflict);
 assert.equal(writes,0);
});
test('first save and storage failure are reported without erasing prior records',()=>{
 const values=new Map<string,string>();
 const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v)}};
 writeIfUnchanged(storage,'workspace',null,'first');
 assert.throws(()=>writeIfUnchanged({...storage,setItem:()=>{throw Error('quota')}},'workspace','first','second'),/quota/);
 assert.equal(values.get('workspace'),'first');
});
