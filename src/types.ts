export type TripStatus = '출발 전' | '이동 중' | '식사 중' | '도착';
export interface GroupArrivalInfo { contactName:string; phone:string; dropoff:string }
export interface Organization { nameKind?:import('./groupName').GroupNameKind; originMode?:'school'|'other'; visitDuration?:'당일'|'1박 2일'|'2박 3일'|'2시간'|'4시간'|''; notes?:string; programType?:import('./programTypes').ProgramType; id:string; name:string; arrival?:GroupArrivalInfo }
export type YouthLevel='elementary'|'middle'|'high'|'university'|'adult'|'preschool';
export interface YouthCountRow {id:string;level:YouthLevel;grade:string;male:number;female:number}
export interface YouthDetails {rows:YouthCountRow[];unclassified:number}
export interface LeaderDetails {male:number;female:number;unclassified:number}
export interface ParticipantCount { leaderDetails?:LeaderDetails; youth:number; leaders:number; youthDetails?:YouthDetails }
export type ParticipantActor = 'admin'|'guide';
export interface ParticipantChange { actor?:ParticipantActor; id:string; before:ParticipantCount; after:ParticipantCount; reason:string; at:string }
export interface Waypoint { baselineMinutesToDestination?:number; roadDistanceKmToDestination?:number; place?:import('./places').PublicPlace; preset?:'rest'; id:string; name:string; kind:'start'|'meal'|'checkpoint'|'destination'; included:boolean; order:number; action:string }
export interface CheckpointReport { createdAt?:string; id:string; waypointId:string; at:string; status:'saved'|'edited'|'cancelled'; editedAt?:string; revisions:{at:string; changedAt:string}[] }
export interface LocationUpdate { lat:number; lng:number; measuredAt:string; method:'mock' }
export interface RouteSummary { distanceKm:number; minutes:number; eta:string; asOf:string; isExample:true }
export interface EnvironmentNotice { id:string; kind:'weather'|'traffic'; severity:'info'|'warning'|'severe'; place:string; validUntil:string; dataStatus:'example'|'unavailable'|'failed'; text:string; detail:{description:string; advice:string[]; asOf:string} }
export interface Schedule { time:string; title:string; description:string }
export interface Announcement { title:string; text:string }
export interface Trip { status:TripStatus; origin:string; destination:string; plannedDeparture:string; meal:{enabled:boolean; name:string}; mealStartedAt:string|null }
export interface SharedPosition {lat:number;lng:number;accuracy:number;measuredAt:string;sentAt:string}
export interface CenterMessage {id:string;text:string;at:string;acknowledgedAt?:string}
export interface DemoState { plannedArrival?:{date:string;time:string;actor:ParticipantActor;updatedAt:string}; centerMessages?:CenterMessage[]; sharedPosition?:SharedPosition; totalRoadDistanceKm?:number; baselineNeedsReview?:boolean; distanceNeedsReview?:boolean; version:1; scenario:string; organization:Organization; trip:Trip; waypoints:Waypoint[]; reports:CheckpointReport[]; initialCounts:ParticipantCount; counts:ParticipantCount; changes:ParticipantChange[]; confirmed:boolean; countsConfirmedAt?:string; location:LocationUpdate; summary:RouteSummary }
