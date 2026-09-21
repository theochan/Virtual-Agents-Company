import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { toJsonSchema } from '@langchain/core/utils/json_schema';
import { AIMessage, type BaseMessage } from '@langchain/core/messages';
import { createDeepAgent } from 'deepagents';
import { createMiddleware, tool } from 'langchain';
import { z } from 'zod';
import type { infer, Message } from './providers';

type BoundTool = { name: string; description?: string; schema: any };
type Inference = (messages: Message[], tools: {id:string;schema:unknown}[]) => ReturnType<typeof infer>;

// The harness never owns a provider endpoint or credentials. Every inference goes
// through VAC's pre-reservation, semaphore, timeout and durable usage accounting.
class GuardedModel extends BaseChatModel {
  constructor(private dispatch:Inference, private allowed:BoundTool[]=[], private finished:()=>boolean=()=>false, private canUse:(name:string)=>boolean=()=>true) { super({maxRetries:0}); }
  _llmType(){return 'vac-guarded-ollama';}
  bindTools(tools:any[]):any{return new GuardedModel(this.dispatch,tools.filter(t=>['submit_workflow'].includes(t.name)&&this.canUse(t.name)),this.finished,this.canUse);}
  async _generate(messages:BaseMessage[]){
    if(this.finished()){const message=new AIMessage('Validated workflow retained.');return {generations:[{text:message.content as string,message}]};}
    let serialized:Message[]=messages.map(m=>({role:m.type==='system'?'system':m.type==='ai'?'assistant':'user',content:JSON.stringify({content:m.content,...(m.type==='ai'?{tool_calls:(m as AIMessage).tool_calls}:{}),...(m.type==='tool'?{tool_result:true}:{})})}));
    // Full decisions remain in VAC's audit log. Keep concise planning state in
    // the model envelope instead of echoing whole rejected plans and todo lists.
    for(let i=0;i<serialized.length;i++){
      const original=messages[i];
      if(original.type==='ai'&&(original as AIMessage).tool_calls?.length){serialized[i].content=JSON.stringify({tool_calls:(original as AIMessage).tool_calls!.map(t=>({name:t.name,args:t.name==='submit_workflow'?{tasks:(t.args.tasks||[]).map((p:any)=>({executor:p.executor,key:p.key,name:p.name,supervisors:p.supervisors,dependsOn:p.dependsOn,agentId:p.agentId,toolSequence:p.toolSequence,requiredToolIds:p.requiredToolIds})),plan:(t.args.plan||[]).map((p:any)=>({key:p.key,parentKey:p.parentKey,dependsOn:p.dependsOn,agentId:p.agentId,toolIds:p.toolIds,toolSequence:p.toolSequence})),toolSequence:t.args.toolSequence}:t.args}))});}
      if(original.type==='tool'&&serialized[i].content.length>900)serialized[i].content=serialized[i].content.slice(0,900)+' [full tool result retained outside model context]';
    }
    if(serialized.length>4)serialized=[...serialized.filter(m=>m.role==='system'),...serialized.filter(m=>m.role!=='system').slice(-3)];
    const compact=(v:any):any=>Array.isArray(v)?v.map(compact):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>!['$schema','default','minLength','maxLength','minimum','maximum'].includes(k)).map(([k,x])=>[k,compact(x)])):v;
    const tools=this.allowed.map(t=>({id:t.name,schema:compact(toJsonSchema(t.schema))}));
    const response=await this.dispatch(serialized,tools);const d=response.decision;
    const message=d.action==='tool'?new AIMessage({content:'',tool_calls:[{id:crypto.randomUUID(),name:d.toolId,args:d.parameters,type:'tool_call'}]}):new AIMessage(d.action==='final'?d.reply:`Blocked: ${d.reason}`);
    if(d.action==='tool'&&!tools.some(t=>t.id===d.toolId))throw new Error('Harness requested an unavailable tool');
    return {generations:[{text:typeof message.content==='string'?message.content:'',message}]};
  }
}

export async function planWithHarness(options:{
  prompt:string; schema:z.ZodObject<any>; signal:AbortSignal;
  infer:Inference; reserveTool:()=>void; validate:(plan:any)=>void; feedback?:(message:string)=>void;
}) {
  let accepted:any;let calls=0;
  const model=new GuardedModel(async(messages,tools)=>{
    options.signal.throwIfAborted();
    if(++calls>4)throw new Error('Harness planning limit exhausted (four model calls)');
    return options.infer(messages,tools);
  },[],()=>!!accepted);
  const submit=tool((plan:any)=>{
    options.signal.throwIfAborted();try{options.validate(plan);}catch(e){const message='WORKFLOW REJECTED. Correct the plan and call submit_workflow next; do not update todos. '+(e instanceof Error?e.message:'Invalid plan');options.feedback?.(message);return message;}accepted=plan;
    return 'Workflow validated and retained for VAC execution.';
  },{name:'submit_workflow',description:'Submit a complete executable workflow. Validation errors are returned for correction within the remaining planning allowance.',schema:options.schema});
  const guard=createMiddleware({name:'VACPlanningBoundary',wrapToolCall:async(request,handler)=>{
    options.signal.throwIfAborted();
    if(!['submit_workflow'].includes(request.toolCall.name))throw new Error('Harness tool is outside planning authority');
    options.reserveTool();return handler(request);
  }});
  const agent=createDeepAgent({model,tools:[submit],systemPrompt:options.prompt,middleware:[
    // Supported name-based middleware replacement. VAC owns files and subagents;
    // giving the planner a second execution path would bypass the trusted kernel.
    createMiddleware({name:'FilesystemMiddleware'}),
    createMiddleware({name:'SubAgentMiddleware'}),
    createMiddleware({name:'todoListMiddleware'}),guard,
  ]});
  const result=await agent.invoke({messages:[{role:'user',content:'Create the workflow now. Call submit_workflow directly. Do not execute the work or answer with an unsubmitted plan.'}]} as never,{signal:options.signal,recursionLimit:16,callbacks:[]});
  if(!accepted)throw new Error('Harness ended without a validated workflow');
  return {workflow:accepted,todos:(result as any).todos||[],modelCalls:calls,harness:'deepagents@1.14.0'};
}
