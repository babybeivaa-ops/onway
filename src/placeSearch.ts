import type {PublicPlace} from './places';
const compact=(s:string)=>s.normalize('NFC').replace(/\s+/gu,'');
export async function searchMealPlaces(name:string,signal:AbortSignal,request:typeof fetch=fetch):Promise<PublicPlace[]>{
 const query=name.trim();if(query.length<2)return [];
 const lookup=async(q:string)=>{signal.throwIfAborted();const r=await request('/api/maps/search?q='+encodeURIComponent(q),{signal});if(!r.ok)throw Error('장소를 검색하지 못했어요. 잠시 후 다시 검색해주세요.');const d=await r.json();if(!Array.isArray(d.items))throw Error('검색 결과를 읽지 못했어요.');return d.items as PublicPlace[];};
 const original=await lookup(query);if(original.length)return original;
 const joined=compact(query),variants=new Set<string>();if(joined!==query)variants.add(joined);
 for(let i=2;i<=Math.min(6,joined.length-2);i++)variants.add(joined.slice(0,i)+' '+joined.slice(i));variants.delete(query);
 for(const q of variants){const items=await lookup(q);const matches=items.filter(p=>{const title=compact(p.name);if(title.includes(joined))return true;if(!title||!joined.endsWith(title))return false;const region=joined.slice(0,-title.length);return region.length>=2&&compact(p.address).includes(region);});if(matches.length)return matches;}
 return [];
}
