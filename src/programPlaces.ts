export function displayProgramPlace(value:string,activity=''){
 if(activity.replace(/\s/g,'')==='천체투영관에서본하늘')return '천체투영관';
 // Staff timetable prefixes identify the room; trailing text lists equipment.
 const prefix=value.normalize('NFKC').trim().match(/^[([{]?\s*(소세|영|명|염|앵|팀|됨|세|소)\s*[)\]}]/)?.[1];
 if(prefix){
  const rooms:Record<string,string>={영:'영상관',명:'영상관',염:'영상관',앵:'영상관',팀:'팀미팅룸',됨:'팀미팅룸',세:'세미나실',소:'소세미나실',소세:'소세미나실'};
  return rooms[prefix];
 }
 const compact=value.replace(/\s/g,'');
 if(['영상관','세미나실','팀미팅룸','소세미나실','덕흥천문대','천체투영관'].includes(compact))return compact;
 if(compact==='명상관')return '영상관';
 const place=value.trim().replace(/^회의실$/,'소세미나실').replace(/선\s*체\s*투\s*통\s*관/g,'천체투영관').replace(/덕[홍효]천문대/g,'덕흥천문대').replace(/팀미팅[롬룹룰]/g,'팀미팅룸');
 if(/^[（(\[]\s*팀\s*[）)\]]$/.test(place)||place==='팀')return '팀미팅룸';
 if(/^[（(\[]\s*팀\s*[）)\]]/.test(place))return place.replace(/^[（(\[]\s*팀\s*[）)\]]\s*\/?\s*/,'팀미팅룸 / ');
 if(/^[（(]\s*영\s*[）)]$/.test(place)||place==='영')return '영상관';
 return place.replace(/^[（(]\s*영\s*[）)]\s*\/?\s*/,'영상관 / ');
}
