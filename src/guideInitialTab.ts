/** Choose the opening tab using the admission date at 18:00 Korea time. */
export function guideInitialTab(travelDate:string,now=Date.now(),admissionCompletedAt?:string):'이동'|'입소안내'{
 if(admissionCompletedAt)return '입소안내';
 if(!/^\d{4}-\d{2}-\d{2}$/.test(travelDate))return '이동';
 const cutoff=Date.parse(travelDate+'T18:00:00+09:00');
 return Number.isFinite(cutoff)&&now>=cutoff?'입소안내':'이동';
}
