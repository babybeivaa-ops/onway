// Match explicit event terms; generic weather notices keep the warning icon.
export function trafficIcon(kind:string,message:string){
 const text=kind+' '+message;
 if(/고장|견인/.test(text))return 'breakdown';
 if(/사고|추돌|충돌|전복/.test(text))return 'accident';
 if(/안개|시정\s*(불량|저하)/.test(text))return 'fog';
 if(/빗길|강우|강수|호우|폭우|우천|노면\s*젖음|비가\s*(내리|오)/.test(text))return 'rain';
 if(/결빙|빙판|적설|강설|폭설|눈길/.test(text))return 'snow';
 if(/강풍|돌풍|횡풍/.test(text))return 'wind';
 if(/공사|작업중|작업 중/.test(text))return 'construction';
 return 'warning';
}

export function trafficLabel(kind:string,message:string){
 const category=trafficIcon(kind,message);
 if(category==='snow')return /결빙|빙판/.test(kind+' '+message)?'결빙':'눈길';
 const labels={breakdown:'차량 고장',accident:'사고',fog:'안개',rain:'빗길',wind:'강풍',construction:'공사',warning:''};
 return labels[category]||(/기상/.test(kind)?'기상 주의':kind||'도로 주의');
}
