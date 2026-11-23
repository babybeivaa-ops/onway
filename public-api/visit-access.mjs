export function guideVisitExpires(group){const nights={'1박 2일':1,'2박 3일':2,'3박 4일':3}[group?.state?.organization?.visitDuration]??0;const start=Date.parse(group?.travelDate+'T00:00:00+09:00');return Number.isFinite(start)?start+(nights+1)*86400000:0;}
export function guideVisitActive(group,now=Date.now()){return now<guideVisitExpires(group);}
