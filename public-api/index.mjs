import {initializeCenterCode} from './center-code.mjs';
import {createFileDocumentStore,createCloudDocumentStore,createLocalDocumentHandler} from './documents.mjs';
import {importBackup} from './import-backup.mjs';
import {importFullData} from './import-full-data.mjs';
import {readDemoWorkspace,removeServerOnlyGroups} from './demo-workspace.mjs';
import {createSupabaseStore} from './supabase-store.mjs';
import {createTrafficHandler} from './traffic.mjs';
import {createTrafficRelayFetch} from './traffic-relay.mjs';
import {createWeatherHandler} from './weather.mjs';
import {randomBytes} from 'node:crypto';
import {createSharingHandler} from './sharing.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRouteHandler} from './routes.mjs';
import {createMapHandler} from './gateway.mjs';

let kakaoKey=process.env.KAKAO_REST_API_KEY?.trim()||'';
if(!kakaoKey&&process.env.KAKAO_KEY_FILE){try{kakaoKey=fs.readFileSync(process.env.KAKAO_KEY_FILE,'utf8').trim();}catch{console.error('카카오 키 파일을 읽을 수 없습니다.');process.exit(1);}}
let javascriptKey=process.env.KAKAO_JAVASCRIPT_KEY?.trim()||'';
if(!javascriptKey&&process.env.KAKAO_JS_KEY_FILE){javascriptKey=fs.readFileSync(process.env.KAKAO_JS_KEY_FILE,'utf8').trim();}
const handler=createMapHandler({kakaoKey,javascriptKey});
const routeHandler=createRouteHandler({key:kakaoKey});
let weatherKey=process.env.KMA_SERVICE_KEY?.trim()||'';
if(!weatherKey&&process.env.KMA_KEY_FILE){try{weatherKey=fs.readFileSync(process.env.KMA_KEY_FILE,'utf8').trim()}catch{console.error('날씨 키 파일을 읽을 수 없습니다.')}}
const weatherHandler=createWeatherHandler({key:weatherKey});
let trafficKey=process.env.ITS_API_KEY?.trim()||'';
if(!trafficKey&&process.env.ITS_KEY_FILE){try{trafficKey=fs.readFileSync(process.env.ITS_KEY_FILE,'utf8').trim()}catch{console.error('도로 키 파일을 읽을 수 없습니다.')}}
const trafficRelayFetch=createTrafficRelayFetch({url:process.env.ITS_RELAY_URL?.trim(),token:process.env.ITS_RELAY_TOKEN?.trim(),ca:process.env.ITS_RELAY_CA_PEM?.trim()});
const trafficHandler=createTrafficHandler({key:trafficRelayFetch?'oracle-relay':trafficKey,fetchImpl:trafficRelayFetch||fetch});
const supabaseUrl=process.env.SUPABASE_URL?.trim();
const supabaseKey=process.env.SUPABASE_SECRET_KEY?.trim()||process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if(!!supabaseUrl!==!!supabaseKey)throw Error('Supabase URL과 서버 키를 함께 설정해주세요.');
if(process.env.RENDER&&(!supabaseUrl||!process.env.ONWAY_ADMIN_TOKEN?.trim()))throw Error('Render에는 Supabase와 관리자 접속 코드 설정이 필요합니다.');
const store=supabaseUrl?createSupabaseStore({url:supabaseUrl,key:supabaseKey}):undefined;
const importedBackup=await importBackup(store,process.env.ONWAY_IMPORT_BACKUP_GZIP_BASE64);
if(importedBackup)console.log('ONWAY backup import verified',JSON.stringify(importedBackup));
const demoWorkspace=readDemoWorkspace(process.env.ONWAY_DEMO_BACKUP_GZIP_BASE64,process.env.ONWAY_DEMO_DOCUMENTS_GZIP_BASE64);
if(process.env.ONWAY_REMOVE_SERVER_ONLY_GROUPS==='1')console.log('ONWAY group cleanup verified',JSON.stringify(await removeServerOnlyGroups(store,demoWorkspace)));
const dataDirectory=process.env.ONWAY_DATA_DIR||fileURLToPath(new URL('../../.onway-server-data/',import.meta.url));
if(!store)fs.mkdirSync(dataDirectory,{recursive:true,mode:0o700});
const adminFile=path.join(dataDirectory,'admin-access.secret');
let adminToken=process.env.ONWAY_ADMIN_TOKEN?.trim();
if(!adminToken&&store)throw Error('ONWAY_ADMIN_TOKEN을 설정해주세요.');
if(!adminToken){if(!fs.existsSync(adminFile))fs.writeFileSync(adminFile,randomBytes(32).toString('base64url'),{mode:0o600});adminToken=fs.readFileSync(adminFile,'utf8').trim();}
if(adminToken.length<32)throw Error('관리자 접속 코드는 32자 이상이어야 합니다.');
const documentStore=store?createCloudDocumentStore({url:supabaseUrl,key:supabaseKey}):createFileDocumentStore(path.join(dataDirectory,'documents'));
const fullData=process.env.ONWAY_IMPORT_FULL_DATA_GZIP_BASE64||[1,2,3,4,5,6,7,8].map(n=>process.env['ONWAY_IMPORT_FULL_DATA_PART_'+n]||'').join('');
const fullImport=await importFullData(store,documentStore,fullData);
if(fullImport)console.log('ONWAY full data import verified',JSON.stringify(fullImport));
const centerCodeInit=await initializeCenterCode(store,process.env.ONWAY_INITIAL_CENTER_CODE_BASE64);
if(centerCodeInit)console.log('ONWAY center code initialization',centerCodeInit.status);
const sharingHandler=createSharingHandler({directory:dataDirectory,adminToken,store,documentStore});
const localDocuments=!store&&!process.env.RENDER?createLocalDocumentHandler(createFileDocumentStore(path.join(dataDirectory,'local-documents'))):null;
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
let windowStart=Date.now(),requests=0;
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','same-origin');
  if(url.pathname==='/healthz'&&(req.method==='GET'||req.method==='HEAD')){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:JSON.stringify({ok:true,storage:store?'supabase':'local'}));return;}
  if(url.pathname.startsWith('/api/')){
   if(url.pathname==='/api/demo-workspace'&&(req.method==='GET'||req.method==='HEAD')){res.writeHead(demoWorkspace?200:404,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:JSON.stringify(demoWorkspace??{error:'No demo snapshot'}));return;}
   if(Date.now()-windowStart>60_000){windowStart=Date.now();requests=0;}
   if(++requests>1000){res.writeHead(429,{'Retry-After':'60'});res.end();return;}
   if(req.headers['sec-fetch-site']==='cross-site'){res.writeHead(403);res.end();return;}
   if(localDocuments&&await localDocuments(req,res,url))return;
   if(await sharingHandler(req,res,url))return;
   if(await weatherHandler(req,res,url))return;
   if(await trafficHandler(req,res,url))return;
   if(await routeHandler(req,res,url))return;
   if(await handler(req,res,url))return;
   res.writeHead(404);res.end();return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  const pathname=decodeURIComponent(url.pathname);
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});
  if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(500);res.end('요청을 처리하지 못했습니다.');}
});
server.listen(Number(process.env.PORT)||4183,process.env.HOST||(process.env.RENDER?'0.0.0.0':'127.0.0.1'),()=>console.log('ONWAY 지도 서버 준비 완료 (키 비공개)'));
