import type {PublicPlace} from './places';
const compact=(value:string)=>value.normalize('NFC').replace(/\s+/gu,'');
export async function searchSchool(name:string,signal:AbortSignal,request:typeof fetch=fetch):Promise<PublicPlace[]>{
 const query=name.trim();
 const lookup=async(q:string)=>{const r=await request('/api/maps/search?q='+encodeURIComponent(q),{signal});if(!r.ok)throw Error(r.status===503?'장소 검색 서버 설정을 확인해주세요.':r.status===502?'장소 검색 서비스에 연결하지 못했어요. 잠시 후 다시 검색해주세요.':'장소 검색 요청을 처리하지 못했어요. 다시 검색해주세요.');const d=await r.json();if(!Array.isArray(d.items))throw Error('검색 결과를 읽지 못했어요. 다시 검색해주세요.');return d.items as PublicPlace[];};
 const endings:Record<string,string>={'초등':'초등학교','초등학':'초등학교','초':'초등학교','중등':'중학교','중학':'중학교','중':'중학교','고등':'고등학교','고등학':'고등학교','고':'고등학교','대학':'대학교'};
 const expand=(value:string)=>value.replace(/초등학$|고등학$|초등$|중등$|고등$|중학$|대학$|초$|중$|고$/,ending=>endings[ending]);
 const fullQuery=expand(query),joined=compact(fullQuery);
 if(!/^[가-힣]+(?:초등학교|중학교|고등학교|대학교)$/.test(joined))return lookup(query);
 const abbreviations:Record<string,string>={'초등학교':'초','중학교':'중','고등학교':'고','대학교':'대학'};
 const abbreviated=fullQuery.replace(/초등학교$|중학교$|고등학교$|대학교$/,ending=>abbreviations[ending]);
 // Search both spellings even when one already returns results. Kakao ranks
 // full names and abbreviations differently, including schools in other cities.
 const queries=[...new Set([query,fullQuery,abbreviated])];
 const responses=await Promise.allSettled(queries.map(lookup));
 signal.throwIfAborted();
 const results=responses.flatMap(r=>r.status==='fulfilled'?r.value:[]);
 const unique=[...new Map(results.map(p=>[p.id,p])).values()];
 const rank=(p:PublicPlace)=>compact(expand(p.name))===joined?2:/(?:^|>)\s*학교\s*(?:>|$)/u.test(p.category||'')?1:0;
 if(unique.length)return unique.sort((a,b)=>rank(b)-rank(a));
 const failure=responses.find(r=>r.status==='rejected');if(failure?.status==='rejected')throw failure.reason;
 const suffix=joined.match(/초등학교$|중학교$|고등학교$|대학교$/)![0];
 const variants=new Set<string>();if(joined!==query)variants.add(joined);
 for(let at=2;at<=Math.min(4,joined.length-suffix.length-2);at++)variants.add(joined.slice(0,at)+' '+joined.slice(at));
 for(const searched of queries)variants.delete(searched);
 for(const variant of variants){signal.throwIfAborted();const results=await lookup(variant);const matching=results.filter(place=>{const title=compact(place.name);if(title===joined)return true;if(!title||!joined.endsWith(title))return false;const region=joined.slice(0,-title.length);return region.length>=2&&compact(place.address).includes(region);});if(matching.length)return matching;}
 return [];
}
