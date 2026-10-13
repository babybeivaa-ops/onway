/** Approximate geographic projection for the illustrative South Korea overview. */
export function overviewPosition(place?:{lat:number;lng:number}){if(!place||!Number.isFinite(place.lat)||!Number.isFinite(place.lng)||place.lat<32.8||place.lat>38.8||place.lng<124.5||place.lng>131.9)return null;return {x:170+(place.lng-127.5)*40,y:32+(38.7-place.lat)*48};}
