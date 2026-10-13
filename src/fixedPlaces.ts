import type {DemoState,Waypoint} from './types';
import type {PublicPlace} from './places';
// VWorld exact-name POIs, checked 2026-09-28. Excludes similarly named bus stops.
export const FIXED_PLACES:Record<string,PublicPlace>={
 arrival:{id:'POI01000000B9CN7M',name:'국립청소년우주센터',category:'스포츠및레크리에이션 > 청소년수련시설',address:'전남광주통합특별시 고흥군 동일면 덕흥양쪽길 200',lat:34.532971970616224,lng:127.46826930052721,provider:'vworld'},
 ic:{id:'POI01000000DX6QNP',name:'고흥IC',category:'인공지명 > 기간시설 > 교통',address:'전남광주통합특별시 고흥군 동강면 한천리 412-2 도',lat:34.82396270775956,lng:127.34215037413877,provider:'vworld'},
 bridge:{id:'POI01000000BWSBIO',name:'나로1대교',category:'인공지명 > 기간시설 > 교통',address:'',lat:34.51980589054667,lng:127.43261122404928,provider:'vworld'}
};
export function withFixedPlace(p:Waypoint):Waypoint {const place=FIXED_PLACES[p.id];return !p.place&&place&&p.name===place.name?{...p,place:{...place}}:p;}
export function withFixedPlaces(s:DemoState):DemoState{return {...s,waypoints:s.waypoints.map(withFixedPlace)};}
export function hasFixedPlace(p:Waypoint){const fixed=FIXED_PLACES[p.id];return !!fixed&&p.place?.id===fixed.id&&p.place.lat===fixed.lat&&p.place.lng===fixed.lng;}
