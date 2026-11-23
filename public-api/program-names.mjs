export function normalizedProgramName(value){return value.replace(/초등학교/g,'초').replace(/중학교/g,'중').replace(/고등학교/g,'고').replace(/군복무/g,'').replace(/관측실습/g,'').replace(/[^가-힣a-z0-9]/gi,'').toLowerCase()}
function oneEdit(a,b){if(Math.abs(a.length-b.length)>1)return false;let i=0,j=0,edits=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue}if(++edits>1)return false;if(a.length>=b.length)i++;if(b.length>=a.length)j++}return edits+(a.length-i)+(b.length-j)<=1}
export function registeredProgramName(source,names){
 const value=normalizedProgramName(source),choices=[...new Set(names.filter(n=>n.trim()))];
 const exact=choices.filter(n=>normalizedProgramName(n)===value);if(exact.length)return exact.includes(source)?source:exact[0];
 const suffix=choices.filter(n=>{const target=normalizedProgramName(n),shorter=value.length<target.length?value:target;return (shorter.length>=4||/^[가-힣]{2,}[초중고]$/.test(shorter))&&(value.endsWith(target)||target.endsWith(value))});
 // 초등학교 -> 초 makes ordinary two-syllable school names three characters.
 // Different spellings of the same short name are not competing schools.
 if(suffix.length)return new Set(suffix.map(normalizedProgramName)).size===1?suffix[0]:source;
 const close=choices.filter(n=>{const target=normalizedProgramName(n);return Math.min(value.length,target.length)>=4&&oneEdit(value,target)});
 return close.length===1?close[0]:source;
}
export function preferRegisteredProgramNames(plan,names){return {...plan,groups:plan.groups.map(g=>({...g,name:registeredProgramName(g.name,names)}))}}
