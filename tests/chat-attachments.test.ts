import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {serveChatAttachments,validateChatAttachments,chatFileKey} from '../public-api/chat-attachments.mjs';
const group:any={id:'school-a',state:{centerMessages:[]}};
function store(){const data=new Map();return {read:async k=>data.get(k),write:async(k,v)=>{data.set(k,v)}}}
async function call(storage,actor,method,query,bytes=Buffer.alloc(0),groups=[group]){let status=0,headers:any,body:any;const req:any=Readable.from([bytes]);req.method=method;req.headers={};await serveChatAttachments(req,{writeHead(s,h){status=s;headers=h},end(b){body=b}},new URL('http://localhost/api/shared/chat-attachments?'+query),{store:storage,actor,groups});return {status,headers,body}}
test('private upload cannot be downloaded until sent; cancelled attachment is inaccessible',async()=>{
 const storage=store(),actor={role:'guide',groupId:'school-a'};
 const uploaded=await call(storage,actor,'POST','groupId=school-a&name=안내.txt',Buffer.from('안녕하세요'));
 const attachment=JSON.parse(uploaded.body).attachment;
 await assert.rejects(call(storage,actor,'GET','groupId=school-a&id='+attachment.id),e=>e.status===404);
 const sent={...group,state:{centerMessages:[{id:'m',text:'파일',attachment}]}};
 await validateChatAttachments({groups:[group]},{groups:[sent]},storage,actor);
 const opened=await call(storage,actor,'GET','groupId=school-a&id='+attachment.id,undefined,[sent]);
 assert.equal(opened.body.toString(),'안녕하세요');assert.match(opened.headers['Content-Disposition'],/^attachment/);
 await assert.rejects(call(storage,{role:'guide',groupId:'school-b'},'GET','groupId=school-a&id='+attachment.id,undefined,[sent]),e=>e.status===403);
 sent.state.centerMessages[0].cancelledAt='2026-11-26';
 await assert.rejects(call(storage,actor,'GET','groupId=school-a&id='+attachment.id,undefined,[sent]),e=>e.status===404);
});
test('reject wrong sender, altered metadata, invalid files and oversize',async()=>{
 const storage=store(),actor={role:'admin'};
 const a=JSON.parse((await call(storage,actor,'POST','groupId=school-a&name=안내.txt',Buffer.from('test'))).body).attachment;
 await assert.rejects(validateChatAttachments({groups:[group]},{groups:[{...group,state:{centerMessages:[{attachment:a}]}}]},storage,actor),e=>e.status===403);
 const sent={...group,state:{centerMessages:[{id:'m',sender:'admin',text:'파일',attachment:a}]}};
 await validateChatAttachments({groups:[group]},{groups:[sent]},storage,actor);
 const changed=structuredClone(sent);changed.state.centerMessages[0].attachment.name='바꿈.txt';
 await assert.rejects(validateChatAttachments({groups:[sent]},{groups:[changed]},storage,actor),e=>e.status===403);
 await assert.rejects(call(storage,actor,'POST','groupId=school-a&name=가짜.png',Buffer.from('<html>')),/형식/);
 await assert.rejects(call(storage,actor,'POST','groupId=school-a&name=실행.html',Buffer.from('<html>')),/선택/);
 await assert.rejects(call(storage,actor,'POST','groupId=school-a&name=큰파일.txt',Buffer.alloc(5*1024*1024+1)),e=>e.status===413);
});
