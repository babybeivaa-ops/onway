import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createTrafficRelayFetch} from '../public-api/traffic-relay.mjs';
const settings={url:'https://129.225.170.100:8443/eventInfo',token:'t'.repeat(48),ca:'-----BEGIN CERTIFICATE-----\nfixture'};
test('relay is opt-in and fails closed for incomplete or insecure configuration',()=>{
 assert.equal(createTrafficRelayFetch({}),undefined);
 assert.throws(()=>createTrafficRelayFetch({url:settings.url}));
 for(const url of ['http://129.225.170.100/eventInfo','https://user:pass@host/eventInfo','https://host/else','https://host/eventInfo?apiKey=x']) assert.throws(()=>createTrafficRelayFetch({...settings,url}));
});
test('relay sends only bounds, authenticates, verifies TLS and preserves provider errors',async()=>{
 let sent;
 const fetchRelay=createTrafficRelayFetch({...settings,requestImpl:(url,options,callback)=>{
  sent={url,options};const req=new EventEmitter();req.end=()=>{
   const res=new EventEmitter();res.statusCode=200;callback(res);
   res.emit('data',Buffer.from(JSON.stringify({header:{resultCode:4001,resultMsg:'monthly quota'}})));res.emit('end');
  };return req;
 }});
 const response=await fetchRelay('https://openapi.its.go.kr:9443/eventInfo?apiKey=ITS_SECRET&type=all&minX=127&maxX=128&minY=34&maxY=35');
 assert.equal(sent.url.origin,'https://129.225.170.100:8443');
 assert.deepEqual([...sent.url.searchParams.keys()],['minX','maxX','minY','maxY']);
 assert.ok(!sent.url.href.includes('ITS_SECRET'));
 assert.equal(sent.options.rejectUnauthorized,true);assert.equal(sent.options.ca,settings.ca);
 assert.equal(sent.options.headers.Authorization,`Bearer ${settings.token}`);
 assert.equal((await response.json()).header.resultCode,4001);
 await assert.rejects(fetchRelay('https://other.example/eventInfo'));
});
test('relay rejects redirect without following it or falling back to direct ITS',async()=>{
 let count=0;
 const f=createTrafficRelayFetch({...settings,requestImpl:(url,options,callback)=>{
  count++;const req=new EventEmitter();req.end=()=>{const res=new EventEmitter();res.statusCode=302;callback(res);res.emit('end')};return req;
 }});
 await assert.rejects(f('https://openapi.its.go.kr:9443/eventInfo?minX=127&maxX=128&minY=34&maxY=35'),{diagnostic:'ITS_RELAY_ERROR'});
 assert.equal(count,1);
});
