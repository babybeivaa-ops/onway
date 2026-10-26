import type {DemoState} from './types';
import {sameCounts} from './participantCounts.ts';
import {participantActorLabel} from './participantActor.ts';

export function guideEditedCurrentCounts(state:Pick<DemoState,'counts'|'changes'>):boolean {
 const latest=state.changes.slice().sort((a,b)=>Date.parse(b.at)-Date.parse(a.at))[0];
 return !!latest&&participantActorLabel(latest.actor,latest.reason)==='인솔교사 변경'
  &&!sameCounts(latest.before,latest.after)&&sameCounts(latest.after,state.counts);
}
