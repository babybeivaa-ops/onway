import os from 'node:os';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import fs from 'node:fs';
import path from 'node:path';
import {createSharingHandler} from '../public-api/sharing.mjs';
import {createFileDocumentStore,createCloudDocumentStore,createLocalDocumentHandler,PDF_LIMIT} from '../public-api/documents.mjs';
import {createGroup} from '../src/workspace.ts';
const admin='admin-document-test-01234567890123456789';
const pdf=Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n');
async function request(h:any,endpoint:string,token=admin,method='GET',data?:any,headers:any={}){
 const req:any=Readable.from(data===undefined?[]:[Buffer.isBuffer(data)?data:Buffer.from(JSON.stringify(data))]);req.method=method;req.headers={host:'localhost',authorization:'Bearer '+token,...headers};req.socket={remoteAddress:'127.0.0.1'};
 let status=0,body:any,responseHeaders:any;
 await h(req,{writeHead(s:number,h:any){status=s;responseHeaders=h},end(v:any){body=Buffer.isBuffer(v)?v:v?JSON.parse(v):null}},new URL(endpoint,'http://localhost'));
 return {status,body,headers:responseHeaders};
}
test('PDF access is scoped to group and date; only admin can replace and delete; disk persists',async t=>{
 fs.mkdirSync('work',{recursive:true});const directory=fs.mkdtempSync(path.join(os.tmpdir(),'onway-pdf-test-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 let h=createSharingHandler({directory,adminToken:admin});const g=createGroup({name:'PDF test',travelDate:'2030-01-01',origin:'학교',youth:10,leaders:1,ic:true,bridge:true});
 assert.equal((await request(h,'/api/shared/publish',admin,'POST',{group:g})).status,200);
 const link=await request(h,'/api/shared/link',admin,'POST',{groupId:g.id});assert.equal(link.status,200,JSON.stringify(link.body));assert.equal(typeof link.body.token,'string');const token=link.body.token;
 const base='/api/shared/documents?'+new URLSearchParams({groupId:g.id,date:g.travelDate});const upload=base+'&kind=schedule&name='+encodeURIComponent('일정표.pdf');
 assert.equal((await request(h,upload,token,'POST',pdf,{'content-type':'application/pdf'})).status,403);
 assert.equal((await request(h,upload,admin,'POST',pdf,{'content-type':'application/pdf'})).status,200);
 h=createSharingHandler({directory,adminToken:admin});
 const read=await request(h,base+'&kind=schedule',token);assert.equal(read.status,200);assert.deepEqual(read.body,pdf);assert.equal(read.headers['Content-Type'],'application/pdf');
 assert.equal((await request(h,base,token)).body.documents.schedule.name,'일정표.pdf');
 assert.equal((await request(h,base.replace(g.id,'other'),token)).status,403);
 assert.equal((await request(h,base.replace(g.travelDate,'2030-01-02'),token)).status,403);
 assert.equal((await request(h,base,'invalid')).status,401);
 assert.equal((await request(h,upload,admin,'POST',Buffer.from('not PDF'),{'content-type':'application/pdf'})).status,400);
 assert.deepEqual((await request(h,base+'&kind=schedule',token)).body,pdf);
 assert.equal((await request(h,upload,admin,'POST',pdf,{'content-type':'application/pdf','content-length':String(PDF_LIMIT+1)})).status,413);
 assert.equal((await request(h,upload.replace('schedule','menu'),admin,'POST',pdf,{'content-type':'application/pdf'})).status,200);
 assert.equal((await request(h,base+'&kind=schedule',token,'DELETE')).status,403);
 assert.equal((await request(h,base+'&kind=schedule',admin,'DELETE')).status,200);
 const result=(await request(h,base,token)).body;assert.equal(result.documents.schedule,null);assert(result.documents.menu);
});
test('local PDF endpoints reject cross-origin and non-loopback requests',async t=>{
 const directory=fs.mkdtempSync(path.resolve('work/pdf-local-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));const h=createLocalDocumentHandler(createFileDocumentStore(directory));
 const endpoint='/api/local-documents?groupId=g&date=2030-01-01';
 assert.equal((await request(h,endpoint)).status,200);
 assert.equal((await request(h,endpoint,admin,'GET',undefined,{origin:'https://untrusted.example'})).status,403);
 assert.equal((await request(h,endpoint,admin,'GET',undefined,{host:'example.com'})).status,403);
});
test('cloud PDFs use a private bucket and do not expose service credentials to clients',async()=>{
 const calls:any[]=[];let exists=false;const objects=new Map();
 const store=createCloudDocumentStore({url:'https://example.supabase.co',key:'sb_secret_test',fetchImpl:async(url:any,options:any)=>{const p=new URL(url).pathname;calls.push({p,options});if(p.endsWith('/bucket/onway-documents'))return Response.json(exists?{public:false}:{message:'not found'},{status:exists?200:404});if(p.endsWith('/bucket')){assert.equal(JSON.parse(options.body).public,false);exists=true;return Response.json({})}if(options.method==='POST'){objects.set(p.split('/').pop(),JSON.parse(options.body));return Response.json({})}const value=objects.get(p.split('/').pop());return value===undefined?Response.json({statusCode:'404',message:'Object not found'},{status:400}):Response.json(value)}});
 assert.equal(await store.read('key'),null);await store.write('key',{name:'x.pdf'});assert.deepEqual(await store.read('key'),{name:'x.pdf'});assert(calls.every(c=>c.options.headers.apikey==='sb_secret_test'));
});

test('weekly menus are shared across groups but only admins write and guides read their visit dates',async t=>{
 fs.mkdirSync('work',{recursive:true});const directory=fs.mkdtempSync(path.join(os.tmpdir(),'onway-weekly-test-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 let h=createSharingHandler({directory,adminToken:admin});const group=createGroup({name:'Meal test',travelDate:'2026-11-13',visitDuration:'1박 2일',origin:'학교',youth:10,leaders:1,ic:true,bridge:true});
 await request(h,'/api/shared/publish',admin,'POST',{group});const token=(await request(h,'/api/shared/link',admin,'POST',{groupId:group.id})).body.token;
 const menu={weekStart:'2026-11-09',sourceName:'menu.pdf',days:Array.from({length:7},(_,i)=>({date:'2026-11-'+String(9+i).padStart(2,'0'),breakfast:['밥'],lunch:['국'],dinner:[]}))};
 assert.equal((await request(h,'/api/shared/weekly-menus',token,'POST',menu)).status,403);
 assert.equal((await request(h,'/api/shared/weekly-menus',admin,'POST',menu)).status,200);
 h=createSharingHandler({directory,adminToken:admin});const read=await request(h,'/api/shared/weekly-menus?start=2026-11-13&end=2026-11-14',token);assert.equal(read.status,200);assert.deepEqual(read.body.menus[0].days.map(d=>d.date),['2026-11-13','2026-11-14']);
 assert.equal((await request(h,'/api/shared/weekly-menus?start=2026-11-09&end=2026-11-15',token)).status,403);
 assert.equal((await request(h,'/api/shared/weekly-menus',admin,'POST',{...menu,days:menu.days.slice(1)})).status,400);
 const replaced=structuredClone(menu);replaced.days[4].lunch=['수정 메뉴'];await request(h,'/api/shared/weekly-menus',admin,'POST',replaced);assert.deepEqual((await request(h,'/api/shared/weekly-menus?start=2026-11-13&end=2026-11-14',token)).body.menus[0].days[0].lunch,['수정 메뉴']);
});
