import type {PublicPlace} from './places';
const compact=(value:string)=>value.normalize('NFC').replace(/\s+/gu,'');
export async function searchSchool(name:string,signal:AbortSignal,request:typeof fetch=fetch):Promise<PublicPlace[]>{
 const query=name.trim();
 const lookup=async(q:string)=>{const r=await request('/api/maps/search?q='+encodeURIComponent(q),{signal});if(!r.ok)throw Error(r.status===503?'장소 검색 서버 설정을 확인해주세요.':r.status===502?'장소 검색 서비스에 연결하지 못했어요. 잠시 후 다시 검색해주세요.':'장소 검색 요청을 처리하지 못했어요. 다시 검색해주세요.');const d=await r.json();if(!Array.isArray(d.items))throw Error('검색 결과를 읽지 못했어요. 다시 검색해주세요.');return d.items as PublicPlace[];};
 const original=await lookup(query);if(original.length)return original;
 const shortName=compact(query);const endings:Record<string,string>={'초등':'초등학교','초등학':'초등학교','초':'초등학교','중등':'중학교','중학':'중학교','중':'중학교','고등':'고등학교','고등학':'고등학교','고':'고등학교','대학':'대학교'};
 const joined=shortName.replace(/초등학$|고등학$|초등$|중등$|고등$|중학$|대학$|초$|중$|고$/,ending=>endings[ending]);if(!/^[가-힣]+(?:초등학교|중학교|고등학교|대학교)$/.test(joined))return [];
 const suffix=joined.match(/초등학교$|중학교$|고등학교$|대학교$/)![0];
 const variants=new Set<string>();if(joined!==query)variants.add(joined);
 for(let at=2;at<=Math.min(4,joined.length-suffix.length-2);at++)variants.add(joined.slice(0,at)+' '+joined.slice(at));
 variants.delete(query);
 for(const variant of variants){signal.throwIfAborted();const results=await lookup(variant);const matching=results.filter(place=>{const title=compact(place.name);if(title===joined)return true;if(!title||!joined.endsWith(title))return false;const region=joined.slice(0,-title.length);return region.length>=2&&compact(place.address).includes(region);});if(matching.length)return matching;}
 return [];
}
