export function displayProgramPlace(value:string){
 const place=value.trim().replace(/덕[홍효]천문대/g,'덕흥천문대').replace(/팀미팅[롬룹룰]/g,'팀미팅룸');
 if(/^[（(]\s*팀\s*[）)]$/.test(place)||place==='팀')return '팀미팅룸';
 if(/^[（(]\s*팀\s*[）)]/.test(place))return place.replace(/^[（(]\s*팀\s*[）)]\s*\/?\s*/,'팀미팅룸 / ');
 if(/^[（(]\s*영\s*[）)]$/.test(place)||place==='영')return '영상관';
 return place.replace(/^[（(]\s*영\s*[）)]\s*\/?\s*/,'영상관 / ');
}
