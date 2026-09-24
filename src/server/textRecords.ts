import { accountingRecordSchema, recordEvidenceSchema, type DecodedRecord } from './reconciliation';

// This is an explicit grammar, not an LLM asserting that its own extraction is true.
// Every nonempty line must belong to a supported header or a complete record.
export function extractTextRecords(text:string):DecodedRecord[]{
 if(Buffer.byteLength(text)>256000||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text))throw new Error('Unsupported text encoding or envelope');
 const lines=text.split(/\r?\n/),active=lines.map((text,index)=>({text,line:index+1})).filter(l=>l.text.trim());
 if(!active.length)throw new Error('Empty text source');
 const span=(line:number,start:number,end:number)=>({line,start,end,quote:lines[line-1].slice(start,end)});
 const amount=(s:string,unit:string)=>{
  if(unit==='minor'&&!/^-?(0|[1-9]\d*)$/.test(s))throw new Error('Minor-unit amount must be an integer');
  if(unit==='major'&&!/^-?(0|[1-9]\d*)\.\d{2}$/.test(s))throw new Error('Major-unit amount requires exactly two decimals');
  if(!['minor','major'].includes(unit))throw new Error('Unsupported monetary unit');
  const value=BigInt(s.replace('.',''));
  if(value>BigInt(Number.MAX_SAFE_INTEGER)||value<BigInt(Number.MIN_SAFE_INTEGER))throw new Error('Unsafe amount');
  return Number(value);
 };
 const record=(fields:Record<string,string>,evidence:any,row:number)=>{
  if(fields.unit==='major'&&!['USD','EUR','SGD','GBP'].includes(fields.currency))throw new Error('Unsupported currency scale');
  const parsed=accountingRecordSchema.parse({...fields,unit:'minor',amount:amount(fields.amount,fields.unit)});
  return {record:parsed,row,evidence:recordEvidenceSchema.parse(evidence)};
 };
 const csvFields=['id','entity','currency','unit','type','amount'];
 if(active[0].text===csvFields.join(','))return active.slice(1).map(l=>{
  const values=l.text.split(',');if(values.length!==6||values.some(v=>!v||v.includes('"')||v.trim()!==v))throw new Error('Unsupported CSV record at line '+l.line);
  let offset=0;const evidence:any={},fields:any={};
  csvFields.forEach((key,i)=>{fields[key]=values[i];evidence[key]=span(l.line,offset,offset+values[i].length);offset+=values[i].length+1;});
  return record(fields,evidence,l.line);
 });
 const legacy=/^Synthetic supplier ([A-Za-z0-9 _-]{1,100})\. ([A-Z]{3}) cents, not dollars\. Count each record ID once; an identical duplicate must be excluded\. Subtract credits from invoices\.$/.exec(active[0].text);
 if(legacy){
  if(!['USD','EUR','SGD','GBP'].includes(legacy[2]))throw new Error('Unsupported cents currency');
  const header=active[0],entityStart='Synthetic supplier '.length,currencyStart=entityStart+legacy[1].length+2;
  return active.slice(1).map(l=>{
   const values=l.text.split(',');if(values.length!==3)throw new Error('Unsupported record at line '+l.line);
   const [id,type,value]=values;
   return record({id,entity:legacy[1],currency:legacy[2],unit:'minor',type,amount:value},{
    id:span(l.line,0,id.length),entity:span(header.line,entityStart,entityStart+legacy[1].length),
    currency:span(header.line,currencyStart,currencyStart+3),unit:span(header.line,currencyStart+4,currencyStart+9),
    type:span(l.line,id.length+1,id.length+1+type.length),amount:span(l.line,id.length+type.length+2,l.text.length)},l.line);
  });
 }
 // A plain text record consists of these six explicit labeled fields, in any order.
 // Blank lines separate records. Unknown/repeated labels or prose fail closed.
 const blocks:typeof active[]=[];let current:typeof active=[];
 for(const [index,line]of lines.entries()){
  if(!line.trim()){if(current.length){blocks.push(current);current=[];}}
  else current.push({text:line,line:index+1});
 }if(current.length)blocks.push(current);
 return blocks.map(block=>{
  const fields:any={},evidence:any={};
  for(const l of block){const match=/^(ID|Entity|Currency|Unit|Type|Amount): (\S(?:.*\S)?)$/.exec(l.text);
   if(!match)throw new Error('Unsupported or ambiguous text at line '+l.line);
   const key=match[1].toLowerCase();if(Object.hasOwn(fields,key))throw new Error('Duplicate field at line '+l.line);
   fields[key]=match[2];evidence[key]=span(l.line,match[1].length+2,l.text.length);
  }
  if(csvFields.some(key=>!Object.hasOwn(fields,key)))throw new Error('Incomplete record at line '+block[0].line);
  return record(fields,evidence,block[0].line);
 });
}
