import { z } from 'zod';
import { SwarmEngine, swarmInput, isSwarmLive } from './swarm';
import { HttpError, uid, now } from './security';

export class Routines {
 private timer?: ReturnType<typeof setInterval>;
 constructor(readonly engine:SwarmEngine){}
 skills(projectId:string){this.engine.workspace.project(projectId);return this.engine.store.all<any>('swarm-skills').filter(s=>s.projectId===projectId);}
 saveSkill(raw:unknown){
  const a=z.object({name:z.string().trim().min(1).max(100),template:swarmInput}).strict().parse(raw);
  this.engine.workspace.project(a.template.projectId);
  const previous=this.skills(a.template.projectId).filter(s=>s.name===a.name);
  const skill={id:uid(),projectId:a.template.projectId,name:a.name,version:previous.length+1,template:a.template,createdAt:now()};
  this.engine.store.put('swarm-skills',skill.id,skill);return skill;
 }
 list(projectId:string){this.engine.workspace.project(projectId);return this.engine.store.all<any>('swarm-routines').filter(r=>r.projectId===projectId);}
 create(raw:unknown){
  const a=z.object({skillId:z.string().max(100),intervalMinutes:z.number().int().min(1).max(525600),maxRuns:z.number().int().min(1).max(100),startsAt:z.string().datetime()}).strict().parse(raw);
  const skill=this.engine.store.get<any>('swarm-skills',a.skillId);if(!skill)throw new HttpError(404,'Skill not found');this.engine.workspace.project(skill.projectId);
  if(Date.parse(a.startsAt)<Date.now()-60000)throw new HttpError(400,'Start must be current or future');
  if(this.list(skill.projectId).filter(r=>r.status==='active').length>=10)throw new HttpError(429,'Active routine limit reached');
  const r={...a,id:uid(),projectId:skill.projectId,status:'active',nextAt:Date.parse(a.startsAt),runs:0,history:[],createdAt:now()};this.engine.store.put('swarm-routines',r.id,r);return r;
 }
 pause(id:string){const r=this.engine.store.get<any>('swarm-routines',id);if(!r)throw new HttpError(404,'Routine not found');r.status='paused';this.engine.store.put('swarm-routines',id,r);return r;}
 tick(){
  for(const r of this.engine.store.all<any>('swarm-routines').filter(r=>r.status==='active'&&r.nextAt<=Date.now())){
   if(r.lastRunId&&isSwarmLive(this.engine.get(r.lastRunId).status))continue;
   if(r.runs>=r.maxRuns){r.status='completed';this.engine.store.put('swarm-routines',r.id,r);continue;}
   try{
    const skill=this.engine.store.get<any>('swarm-skills',r.skillId);if(!skill)throw new Error('Pinned skill version missing');
    this.engine.store.transaction(()=>{
     const job=this.engine.create(skill.template,`routine-${r.id}-${r.runs}`);
     r.history.push({runId:job.id,scheduledAt:r.nextAt,startedAt:now()});r.lastRunId=job.id;r.runs++;r.nextAt=Date.now()+r.intervalMinutes*60000;
     if(r.runs>=r.maxRuns)r.status='completed';this.engine.store.put('swarm-routines',r.id,r);
    });
   }catch(e){r.status='paused';r.error=e instanceof Error?e.message:'Routine failed';this.engine.store.put('swarm-routines',r.id,r);}
  }
 }
 start(){this.tick();this.timer=setInterval(()=>{try{this.tick();}catch(e){console.error('Routine scheduler failed',e instanceof Error?e.message:'unknown');}},1000);this.timer.unref();}
 stop(){if(this.timer)clearInterval(this.timer);}
}
