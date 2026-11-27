import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDemo} from '../src/data.ts';
import {guideJourneyStatus} from '../src/adminJourney.ts';
test('guide badge follows admission even with stale stored trip status',()=>{const s=createDemo();s.trip.status='출발 전';s.reports=[];s.adminCheckpointChecks=[];assert.equal(guideJourneyStatus(s),'출발 전');s.admissionCompletedAt='2026-11-27T01:00:00Z';assert.equal(guideJourneyStatus(s),'입소 완료');s.admissionCompletedAt=undefined;assert.equal(guideJourneyStatus(s),'출발 전');s.reports=[{id:'test',waypointId:'start',at:'2026-11-27T00:00:00Z',createdAt:'2026-11-27T00:00:00Z',status:'saved',revisions:[]}];assert.equal(guideJourneyStatus(s),'이동 중')});
