/** Keep meaningful institution terms together without changing stored names. */
export function GroupNameText({name}:{name:string}){
 return <>{name.split(/(청소년|문화\s*의\s*집)/u).map((part,index)=>/^(?:청소년|문화\s*의\s*집)$/u.test(part)?<span key={index} className="group-name-word" style={{display:'inline-block',whiteSpace:'nowrap'}}>{part}</span>:part)}</>;
}
