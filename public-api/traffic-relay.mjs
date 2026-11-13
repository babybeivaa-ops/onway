import https from 'node:https';

// Relay credentials and the ITS key must never be sent to arbitrary destinations.
export function createTrafficRelayFetch({url, token, ca, requestImpl=https.request}) {
  if (!url && !token && !ca) return undefined;
  if (!url || !token || !ca) throw Error('ITS relay URL, token and certificate are all required');
  const endpoint=new URL(url);
  if(endpoint.protocol!=='https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || endpoint.pathname!=='/eventInfo') throw Error('Invalid ITS relay endpoint');
  if(token.length<32 || /[\r\n]/.test(token)) throw Error('Invalid ITS relay token');
  ca=ca.replace(/\\n/g,'\n');
  if(!ca.includes('-----BEGIN CERTIFICATE-----')) throw Error('Invalid ITS relay certificate');
  return (input,{signal}={})=>new Promise((resolve,reject)=>{
    const upstream=new URL(input);
    if(upstream.origin!=='https://openapi.its.go.kr:9443' || upstream.pathname!=='/eventInfo') return reject(Error('Unsupported ITS request'));
    const target=new URL(endpoint);
    for(const field of ['minX','maxX','minY','maxY']) {
      const value=upstream.searchParams.get(field);
      if(value===null) return reject(Error('Missing bounds'));
      target.searchParams.set(field,value);
    }
    const request=requestImpl(target,{method:'GET',ca,rejectUnauthorized:true,signal,timeout:18000,headers:{Authorization:`Bearer ${token}`,Accept:'application/json'}},response=>{
      const chunks=[]; let size=0;
      response.on('error',reject);
      response.on('data',chunk=>{
        size+=chunk.length;
        if(size>4*1024*1024) {response.destroy();request.destroy(Error('Relay response too large'));return;}
        chunks.push(chunk);
      });
      response.on('end',()=>{
        const status=response.statusCode||502;
        if(status<200 || status>=300) return reject(Object.assign(Error('Relay failed'),{diagnostic:'ITS_RELAY_ERROR'}));
        resolve(new Response(Buffer.concat(chunks),{status:200,headers:{'Content-Type':'application/json'}}));
      });
    });
    request.on('error',reject);
    request.on('timeout',()=>request.destroy(Error('Relay timeout')));
    request.end();
  });
}
