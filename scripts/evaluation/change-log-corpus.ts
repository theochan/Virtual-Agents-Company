// Synthetic development fixtures. Hidden expected fields are never injected into run prompts.
export function changeLogCases(){
 return [0,1,2].map(trial=>{
  const inputs:Record<string,string>={},expected:any[]=[];
  for(const [index,project] of ['Harbor','Summit'].entries()){
   const name=project.toLowerCase()+'.txt';
   let text=`${project} release change log. Each entry records its own status. Only APPROVED entries change the committed launch date and capacity; PROPOSED, REJECTED and WITHDRAWN entries never replace an approved entry. Use the latest APPROVED entry by sequence number. The complete log follows.\n\n`;
   for(let i=1;i<=24;i++){
    const status=i===3||i===12||i===21?'APPROVED':i%3===0?'WITHDRAWN':i%2===0?'REJECTED':'PROPOSED';
    const date=`2027-${String(2+trial).padStart(2,'0')}-${String(1+((i*3+index*4+trial)%27)).padStart(2,'0')}`;
    const capacity=80+trial*11+index*7+i*2;
    const id=`${project.slice(0,1)}${trial+1}-${String(i).padStart(2,'0')}`;
    const quote=`Entry ${id}: ${status}. Launch ${date}; capacity ${capacity} seats.`;
    text+=quote+' Planning note: operations considered staffing, customer notices, venue access, training slots and support coverage for this revision. These notes describe the proposal and do not change the recorded approval status.\n';
    if(i===21)expected.push({project,entry:id,launch:date,capacity,source:name,quote});
   }
   inputs[name]=text;
  }
  return {id:'release-'+(trial+1),inputs,expected,order:trial===0?['single','planned','autonomous']:trial===1?['planned','autonomous','single']:['autonomous','single','planned']};
 });
}
