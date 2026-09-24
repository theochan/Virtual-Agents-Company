// Fresh values and approval positions; same synthetic template family, not independent human authorship.
export function freshChangeLogCases(){
 return [0,1,2].map(trial=>{
  const inputs:Record<string,string>={},expected:any[]=[];
  for(const [index,project] of ['Harbor','Summit'].entries()){
   const name=project.toLowerCase()+'.txt',latest=[19,22,20][(trial+index)%3];
   let text=`${project} release change log. Each entry records its own status. Only APPROVED entries change the committed launch date and capacity; PROPOSED, REJECTED and WITHDRAWN entries never replace an approved entry. Use the latest APPROVED entry by sequence number. The complete log follows.\n\n`;
   for(let i=1;i<=24;i++){
    const status=i===4||i===11||i===latest?'APPROVED':i%3===0?'WITHDRAWN':i%2===0?'REJECTED':'PROPOSED';
    const date=`2028-${String(6+trial).padStart(2,'0')}-${String(1+((i*7+index*9+trial*5)%27)).padStart(2,'0')}`;
    const capacity=143+trial*13+index*17+i*3,id=`${project.slice(0,1)}${trial+7}-${String(i).padStart(2,'0')}`;
    const quote=`Entry ${id}: ${status}. Launch ${date}; capacity ${capacity} seats.`;
    text+=quote+' Planning note: operations considered staffing, customer notices, venue access, training slots and support coverage for this revision. These notes describe the proposal and do not change the recorded approval status.\n';
    if(i===latest)expected.push({project,entry:id,launch:date,capacity,source:name,quote});
   }
   inputs[name]=text;
  }
  return {id:'fresh-release-'+(trial+1),inputs,expected,order:trial===0?['single','planned','autonomous']:trial===1?['planned','autonomous','single']:['autonomous','single','planned']};
 });
}
