/** Necessary execution cost, not a guarantee: corrections and tool selection can cost more. */
export function assertWorkflowCapacity(
  nodes: Array<{name:string;toolSequence?:string[];requiredToolIds?:string[];calls?:number}>,
  limits: {maxModelCalls:number;maxCallsPerAgent:number;maxToolCalls:number},
  used: {modelCalls:number;toolCalls:number},
  reviewCalls=0,
) {
  const operations=nodes.map(n=>(n.toolSequence?.length||0)+[...new Set(n.requiredToolIds||[])].filter(t=>!n.toolSequence?.includes(t)).length);
  const modelCalls=operations.reduce((a,b)=>a+b,0)+nodes.length+reviewCalls;
  const toolCalls=operations.reduce((a,b)=>a+b,0);
  const errors:string[]=[];
  nodes.forEach((n,i)=>{const minimum=(n.calls||0)+operations[i]+1+(i===0?reviewCalls:0);if(minimum>limits.maxCallsPerAgent)errors.push(`${n.name} needs at least ${minimum} model calls including completion; per-agent limit ${limits.maxCallsPerAgent}`);});
  if(used.modelCalls+modelCalls>limits.maxModelCalls)errors.push(`execution needs at least ${modelCalls} more model calls; ${limits.maxModelCalls-used.modelCalls} remain`);
  if(used.toolCalls+toolCalls>limits.maxToolCalls)errors.push(`execution needs at least ${toolCalls} more tool calls; ${limits.maxToolCalls-used.toolCalls} remain`);
  if(errors.length)throw new Error('Plan cannot fit immutable execution limits: '+errors.join('; ')+'. Reduce unnecessary operations without dropping requirements; do not increase limits.');
  return {minimumRemainingModelCalls:modelCalls,minimumRemainingToolCalls:toolCalls,lowerBoundOnly:true};
}
