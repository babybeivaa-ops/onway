// All lines belong to one bounded registration block in a single column.
// A project/course title may be followed by the actual school in the 구분 row.
export function programRegistrationIdentity(lines:readonly string[]){
 const entries=[...new Set(lines.map(line=>line.replace(/^[^가-힣a-zA-Z0-9]+|[^가-힣a-zA-Z0-9)]+$/g,'').replace(/초[틈둥틀]학교/g,'초등학교').replace(/^(?:사업\s*[/·]?\s*단체|구분)\s*[:：]?\s*/,'').trim()).filter(Boolean))];
 const institution=entries.find(line=>/(?:초등학교|중학교|고등학교|대학교)/.test(line));
 const name=institution??entries[0]??'';
 return {name,aliases:entries.filter(line=>line!==name).join(',')};
}
