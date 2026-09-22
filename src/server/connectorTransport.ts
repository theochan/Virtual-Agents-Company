import { callMcp } from './mcp';
import { publicRequest } from './browser';

// Shared bounded transport for execution and owner-triggered read-only reconciliation.
export async function invokeConnector(config:any,tool:string,args:Record<string,unknown>,callId:string,signal:AbortSignal){
 signal.throwIfAborted();
 if(config.protocol==='mcp')return callMcp(config,tool,args,signal);
 const headers:Record<string,string>={'content-type':'application/json'};
 if(config.tokenEnv){const token=process.env[config.tokenEnv];if(!token)throw new Error('Connector credential unavailable');headers.authorization='Bearer '+token;}
 const body=Buffer.from(JSON.stringify({jsonrpc:'2.0',id:callId,method:'tools/call',params:{name:tool,arguments:args}}));
 if(body.length>64000)throw new Error('Connector request too large');
 let status:number,data:string;
 const boundedSignal=AbortSignal.any([signal,AbortSignal.timeout(15000)]);
 if((process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS||'').split(',').includes(config.endpoint)){
  const res=await fetch(config.endpoint,{method:'POST',headers,body,redirect:'error',signal:boundedSignal});status=res.status;
  const reader=res.body?.getReader();const chunks:Uint8Array[]=[];let bytes=0;
  if(reader){while(true){const r=await reader.read();if(r.done)break;bytes+=r.value.byteLength;if(bytes>128000){await reader.cancel();throw new Error('Connector response too large');}chunks.push(r.value);}}
  data=Buffer.concat(chunks).toString('utf8');
 }else{const res=await publicRequest({url:config.endpoint,method:'POST',headers,body},boundedSignal);status=res.status;data=res.body.toString();}
 if(status!==200)throw new Error('Connector HTTP '+status);
 let result:any;try{result=JSON.parse(data);}catch{throw new Error('Invalid connector JSON response');}
 if(result.id!==callId||result.error||result.result?.isError)throw new Error('Connector rejected operation');
 return result.result??null;
}
