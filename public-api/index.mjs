import {importBackup} from './import-backup.mjs';
import {readDemoWorkspace,removeServerOnlyGroups} from './demo-workspace.mjs';
import {createSupabaseStore} from './supabase-store.mjs';
import {createTrafficHandler} from './traffic.mjs';
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
const trafficHandler=createTrafficHandler({key:trafficKey});
const supabaseUrl=process.env.SUPABASE_URL?.trim();
const supabaseKey=process.env.SUPABASE_SECRET_KEY?.trim()||process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if(!!supabaseUrl!==!!supabaseKey)throw Error('Supabase URL과 서버 키를 함께 설정해주세요.');
if(process.env.RENDER&&(!supabaseUrl||!process.env.ONWAY_ADMIN_TOKEN?.trim()))throw Error('Render에는 Supabase와 관리자 접속 코드 설정이 필요합니다.');
const store=supabaseUrl?createSupabaseStore({url:supabaseUrl,key:supabaseKey}):undefined;
const importedBackup=await importBackup(store,process.env.ONWAY_IMPORT_BACKUP_GZIP_BASE64);
if(importedBackup)console.log('ONWAY backup import verified',JSON.stringify(importedBackup));
const demoWorkspace=readDemoWorkspace(process.env.ONWAY_DEMO_BACKUP_GZIP_BASE64);
if(process.env.ONWAY_REMOVE_SERVER_ONLY_GROUPS==='1')console.log('ONWAY group cleanup verified',JSON.stringify(await removeServerOnlyGroups(store,demoWorkspace)));
const dataDirectory=process.env.ONWAY_DATA_DIR||fileURLToPath(new URL('../../.onway-server-data/',import.meta.url));
if(!store)fs.mkdirSync(dataDirectory,{recursive:true,mode:0o700});
const adminFile=path.join(dataDirectory,'admin-access.secret');
let adminToken=process.env.ONWAY_ADMIN_TOKEN?.trim();
if(!adminToken&&store)throw Error('ONWAY_ADMIN_TOKEN을 설정해주세요.');
if(!adminToken){if(!fs.existsSync(adminFile))fs.writeFileSync(adminFile,randomBytes(32).toString('base64url'),{mode:0o600});adminToken=fs.readFileSync(adminFile,'utf8').trim();}
if(adminToken.length<32)throw Error('관리자 접속 코드는 32자 이상이어야 합니다.');
const sharingHandler=createSharingHandler({directory:dataDirectory,adminToken,store});
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
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
