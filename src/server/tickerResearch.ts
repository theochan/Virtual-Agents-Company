import {z} from 'zod';
import {createHash} from 'node:crypto';

const iso=z.string().datetime({offset:true});
const claim=z.object({id:z.string().min(1),url:z.string().url(),quote:z.string().min(25).max(600)}).strict();
const common={ticker:z.string(),status:z.enum(['ready','blocked']),gaps:z.array(z.string()),claims:z.array(claim).max(16)};
const number=z.number().finite();
const quote=z.object({value:number.positive(),currency:z.literal('USD'),timestamp:iso,timestampText:z.string().min(1),session:z.enum(['regular','close']),claimId:z.string(),publisher:z.string().min(1)}).strict();
export const priceEvidenceSchema=z.object({...common,quotes:z.array(quote).max(3),calendar:z.object({regularSessionOpen:z.boolean(),latestRegularClose:iso,claimId:z.string()}).nullable()}).strict();
const metric=z.object({name:z.enum(['revenue','netIncome','operatingCashFlow','capitalExpenditure','cash','debt','dilutedShares','dilutedEPS']),value:number,unit:z.enum(['USD','USD_millions','shares_millions','USD_per_share']),period:z.string().min(1),basis:z.enum(['GAAP','non-GAAP']),claimId:z.string()}).strict();
export const fundamentalsEvidenceSchema=z.object({...common,periodEnd:iso.nullable(),reportDate:iso.nullable(),filingUrl:z.string().url().nullable(),releaseUrl:z.string().url().nullable(),metrics:z.array(metric).max(12),guidance:z.string(),latestAvailableVerified:z.boolean()}).strict();
export const eventsEvidenceSchema=z.object({...common,events:z.array(z.object({title:z.string(),date:iso.nullable(),classification:z.enum(['occurred','confirmed','estimated','unconfirmed']),materiality:z.string(),claimId:z.string()}).strict()).max(12),coverage:z.string()}).strict();
const scenario=z.object({name:z.enum(['bear','base','bull']),target:number.positive(),probability:number.min(0).max(1),dividends:number.min(0),assumptions:z.string().min(10),claimIds:z.array(z.string()).min(1)}).strict();
export const valuationEvidenceSchema=z.object({...common,method:z.string(),scenarios:z.array(scenario).max(3),weightedReturn:number.nullable(),thesisBroken:z.boolean(),thesisBreakClaimIds:z.array(z.string()),sensitivity:z.string()}).strict();
export const researchReviewSchema=z.object({...common,verdict:z.enum(['pass','fail','inconclusive']),findings:z.array(z.string()),reviewedClaimIds:z.array(z.string()),calculationsVerified:z.boolean()}).strict();
export const tickerDecisionSchema=z.object({ticker:z.string(),currency:z.literal('USD'),horizonMonths:z.literal(12),status:z.enum(['ready','blocked']),recommendation:z.enum(['BUY','HOLD','SELL']).nullable(),price:number.positive().nullable(),weightedReturn:number.nullable(),claimIds:z.array(z.string()),rationale:z.string().min(20),gaps:z.array(z.string()),conditions:z.array(z.string()).min(1)}).strict();
export const tickerFileSchemas={'price.json':priceEvidenceSchema,'fundamentals.json':fundamentalsEvidenceSchema,'events.json':eventsEvidenceSchema,'valuation.json':valuationEvidenceSchema,'review.json':researchReviewSchema,'decision.json':tickerDecisionSchema};
export type ResearchPage={url:string;text:string;retrievedAt:string;sha256:string;nodeId:string;callId:string};
export function researchPages(nodes:Array<{id:string;receipts:Array<Record<string,any>>}>):ResearchPage[]{
 return nodes.flatMap(n=>n.receipts.filter(r=>r.toolId==='tool-browser'&&r.status==='succeeded'&&typeof r.output?.text==='string').map(r=>({url:r.output.url,text:r.output.text,retrievedAt:r.output.retrievedAt,sha256:createHash('sha256').update(r.output.text).digest('hex'),nodeId:n.id,callId:r.callId})));
}
const canonicalUrl=(url:string)=>{const u=new URL(url);u.hash='';return u.href.replace(/\/$/,'');};
const normalized=(text:string)=>text.replace(/\s+/g,' ').trim();
const containsNumber=(text:string,value:number)=>Array.from(text.replace(/,/g,'').matchAll(/-?\d+(?:\.\d+)?/g)).some(m=>Number(m[0])===value);
export function classifyTickerDecision(weightedReturn:number,bearReturn:number,thesisBroken:boolean){return thesisBroken||weightedReturn<=-0.1+1e-12?'SELL':weightedReturn>=0.15-1e-12&&bearReturn>=-0.25-1e-12?'BUY':'HOLD';}
/** Deterministic screening, never a substitute for independent source/assumption adjudication. */
export function validateTickerResearch(raw:Record<string,unknown>,pages:ResearchPage[],cutoff:string,ticker='MSFT'){
 const errors:string[]=[];const parsed:Record<string,any>={};
 for(const [name,schema]of Object.entries(tickerFileSchemas)){const result=schema.safeParse(raw[name]);if(!result.success)errors.push(`${name}: schema ${result.error.issues.map(i=>i.path.join('.')+': '+i.message).join('; ')}`);else parsed[name]=result.data;}
 if(errors.length)return{readyForIndependentAudit:false,safeBlocked:false,errors,claims:[],calculation:null};
 const p=parsed['price.json'],f=parsed['fundamentals.json'],e=parsed['events.json'],v=parsed['valuation.json'],r=parsed['review.json'],d=parsed['decision.json'];
 for(const [name,file]of Object.entries(parsed))if(file.ticker!==ticker)errors.push(`${name}: wrong ticker`);
 const claims=new Map<string,{id:string;url:string;quote:string;page?:ResearchPage}>();
 for(const file of [p,f,e,v,r])for(const c of file.claims){
  const prior=claims.get(c.id);if(prior&&(prior.url!==c.url||prior.quote!==c.quote))errors.push(`Claim ${c.id}: conflicting definition`);
  const page=pages.find(page=>canonicalUrl(page.url)===canonicalUrl(c.url)&&normalized(page.text).includes(normalized(c.quote))&&Number.isFinite(Date.parse(page.retrievedAt))&&Date.parse(page.retrievedAt)>=Date.parse(cutoff)-1000);
  if(!page)errors.push(`Claim ${c.id}: no current-run browser excerpt support`);
  claims.set(c.id,{...c,page});
 }
 const requireClaim=(id:string,label:string)=>{const c=claims.get(id);if(!c?.page)errors.push(`${label}: unsupported claim ${id}`);return c;};
 const decisionCritical=new Set<string>();const critical=(id:string,label:string)=>{decisionCritical.add(id);return requireClaim(id,label);};
 if(d.status==='ready'){
  if(d.recommendation===null||d.gaps.length||[p,f,e,v,r].some(x=>x.status!=='ready'||x.gaps.length))errors.push('Ready decision has missing evidence or unresolved gaps');
  if(p.quotes.length<2)errors.push('Two independent quotes required');
  const domains=new Set(p.quotes.map((q:any)=>{const c=requireClaim(q.claimId,'quote');return c?new URL(c.url).hostname.replace(/^www\./,''):'';}));
  if(domains.size<2)errors.push('Quote sources must have distinct publishers/domains');
  if(!p.calendar)errors.push('Missing sourced session calendar');
  else critical(p.calendar.claimId,'calendar');
  for(const q of p.quotes){const c=critical(q.claimId,'quote');
   if(c&&(!containsNumber(c.quote,q.value)||!normalized(c.quote).includes(normalized(q.timestampText))))errors.push('Quote value/timestamp not present in cited excerpt');
   const at=Date.parse(q.timestamp),collected=Date.parse(c?.page?.retrievedAt||'');
   if(!Number.isFinite(at)||at>collected+60000)errors.push('Quote timestamp is invalid or in the future');
   if(p.calendar?.regularSessionOpen){if(q.session!=='regular'||collected-at>20*60000)errors.push('Quote is stale or wrong session');}
   else if(!p.calendar||q.session!=='close'||Math.abs(at-Date.parse(p.calendar.latestRegularClose))>60000||collected-at>4*86400000)errors.push('Quote does not match latest declared regular close');
  }
  if(p.quotes.length>=2){const [a,b]=p.quotes;if(a.session!==b.session||Math.abs(Date.parse(a.timestamp)-Date.parse(b.timestamp))>60000)errors.push('Quotes are not comparable');if(Math.abs(a.value-b.value)/a.value>0.005)errors.push('Material quote disagreement');}
  if(!f.latestAvailableVerified||!f.periodEnd||!f.reportDate||Date.parse(f.reportDate)>Date.parse(cutoff)||Date.parse(f.periodEnd)>Date.parse(f.reportDate))errors.push('Latest financial period/report dates unverified or inconsistent');
  for(const [label,url]of [['filing',f.filingUrl],['release',f.releaseUrl]])if(!url||!pages.some(page=>canonicalUrl(page.url)===canonicalUrl(url)))errors.push(`Missing opened ${label}`);
  const expectedUnits:Record<string,string>={revenue:'USD_millions',netIncome:'USD_millions',operatingCashFlow:'USD_millions',capitalExpenditure:'USD_millions',cash:'USD_millions',debt:'USD_millions',dilutedShares:'shares_millions',dilutedEPS:'USD_per_share'};
  if(new Set(f.metrics.map((m:any)=>m.name)).size!==f.metrics.length)errors.push('Duplicate financial metric');
  for(const name of Object.keys(expectedUnits))if(!f.metrics.some((m:any)=>m.name===name))errors.push(`Missing metric ${name}`);
  for(const m of f.metrics){const c=critical(m.claimId,m.name);if(m.unit!==expectedUnits[m.name]||m.basis!=='GAAP'||!m.period.trim())errors.push(`${m.name}: incompatible unit/basis/period`);if(c&&!containsNumber(c.quote,m.value))errors.push(`${m.name}: number absent from excerpt`);}
  if(!e.coverage.trim()||!e.events.length)errors.push('Missing bounded events coverage');
  for(const event of e.events){const c=critical(event.claimId,'event');if(event.classification==='confirmed'&&c&&!/(^|\.)microsoft\.com$/.test(new URL(c.url).hostname))errors.push('Confirmed event lacks issuer source');if(event.classification==='confirmed'&&!event.date)errors.push('Confirmed event has no date');if(event.date&&Math.abs(Date.parse(event.date)-Date.parse(cutoff))>90*86400000)errors.push('Event outside declared 90-day window');if(event.classification==='occurred'&&event.date&&Date.parse(event.date)>Date.parse(cutoff))errors.push('Future event labeled occurred');}
  if(!v.method.trim()||!v.sensitivity.trim()||v.scenarios.length!==3||new Set(v.scenarios.map((s:any)=>s.name)).size!==3)errors.push('Missing distinct bear/base/bull scenarios or methodology');
  for(const s of v.scenarios)for(const id of s.claimIds)critical(id,'valuation assumption');
  if(v.thesisBroken&&!v.thesisBreakClaimIds.length)errors.push('Thesis break has no evidence');for(const id of v.thesisBreakClaimIds)critical(id,'thesis break');
  if(Math.abs(v.scenarios.reduce((n:number,s:any)=>n+s.probability,0)-1)>1e-6)errors.push('Scenario probabilities must sum to one');
  if(r.verdict!=='pass'||r.findings.length||!r.calculationsVerified)errors.push('Reviewer did not resolve material findings');
  for(const id of decisionCritical)if(!r.reviewedClaimIds.includes(id))errors.push(`Reviewer omitted material claim ${id}`);
  for(const id of d.claimIds)requireClaim(id,'decision');if(!d.claimIds.length)errors.push('Decision has no source references');
 }
 const current=p.quotes[0]?.value;let calculation:{weightedReturn:number;bearReturn:number;recommendation:string}|null=null;
 if(current&&v.scenarios.length===3){const weighted=v.scenarios.reduce((n:number,s:any)=>n+s.probability*((s.target+s.dividends)/current-1),0);const bear=v.scenarios.find((s:any)=>s.name==='bear');if(bear)calculation={weightedReturn:weighted,bearReturn:bear.target/current-1,recommendation:classifyTickerDecision(weighted,bear.target/current-1,v.thesisBroken)};}
 if(d.status==='ready'){
  if(!calculation||d.price!==current||v.weightedReturn===null||d.weightedReturn===null||Math.abs(v.weightedReturn-calculation.weightedReturn)>1e-6||Math.abs(d.weightedReturn-calculation.weightedReturn)>1e-6||d.recommendation!==calculation.recommendation)errors.push('Decision/calculation does not match deterministic policy');
 }
 const safeBlocked=d.status==='blocked'&&d.recommendation===null&&d.gaps.length>0;
 if(d.status==='blocked'&&!safeBlocked)errors.push('Blocked decision must have null recommendation and explicit gaps');
 return{readyForIndependentAudit:d.status==='ready'&&errors.length===0,safeBlocked:safeBlocked&&errors.length===0,errors,claims:[...claims.values()].map(c=>({id:c.id,url:c.url,quote:c.quote,sourceSha256:c.page?.sha256,retrievedAt:c.page?.retrievedAt,nodeId:c.page?.nodeId,callId:c.page?.callId})),calculation};
}
