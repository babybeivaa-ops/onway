import type {PublicPlace} from './places';
export const NARO_BRIDGE_ID='custom-naro2-bridge';
// Kakao place search verified 2026-10-26; distinct from Naro Bridge 1.
export const NARO_BRIDGE_PLACE:PublicPlace={id:'15151204',name:'나로2대교',address:'전남광주통합특별시 고흥군 동일면 봉영리 1688-3',category:'교통,수송 > 도로시설 > 교량,다리 > 대교',lat:34.47748604682972,lng:127.45806446034042,provider:'kakao'};
export function isNaroOrigin(place:PublicPlace|undefined){if(!place)return false;const name=place.name.replace(/\s+/gu,'');return name==='나로우주센터'||(/^나로우주센터우주과학관/u.test(name)&&place.lat>34.44&&place.lat<34.47&&place.lng>127.50&&place.lng<127.54);}
