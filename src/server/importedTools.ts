import { createHash } from 'node:crypto';
import { z } from 'zod';
import meeting from './importedMeetingCost.json';

// Only reviewed bytes are bundled. No caller-controlled path, module, argv or code.
export const importedToolSchema = z.object({
  importedTool: z.literal('meeting-cost-v1'),
  arguments: z.object({
    attendees: z.number().int().min(1).max(10000),
    minutes: z.number().int().min(1).max(1440),
    avg_rate: z.number().finite().min(0).max(100000),
    include_refocus: z.boolean(), has_decision: z.boolean(),
    has_agenda: z.boolean(), has_owner: z.boolean(),
  }).strict(),
}).strict();
export const importedToolProvenance = {
  id: meeting.id, path: meeting.path, upstreamRevision: meeting.upstreamRevision,
  sha256: meeting.sha256, license: meeting.license, adapterVersion: 1,
  dependencies: ['Python standard library: argparse, json, sys, typing'],
  sideEffects: ['Writes meeting-cost.json inside the isolated workspace'],
};
export function importedToolCode(raw: unknown) {
  const input = importedToolSchema.parse(raw);
  if (createHash('sha256').update(meeting.source).digest('hex') !== meeting.sha256)
    throw new Error('Imported tool source integrity failure');
  const source = Buffer.from(meeting.source).toString('base64');
  const args = Buffer.from(JSON.stringify(input.arguments)).toString('base64');
  return {
    language: 'python' as const, inputNames: [] as string[],
    code: `import base64,json,pathlib\nnamespace={'__name__':'qualified_import'}\nexec(compile(base64.b64decode('${source}'), 'meeting_cost_calculator.py', 'exec'),namespace)\nresult=namespace['evaluate'](**json.loads(base64.b64decode('${args}')))\npathlib.Path('meeting-cost.json').write_text(json.dumps(result,allow_nan=False),encoding='utf-8')\n`,
  };
}
const money = z.number().finite().nonnegative();
const outputSchema = z.object({
  inputs: z.object({ attendees: z.number(), minutes: z.number(), avg_rate_per_hour: z.number(),
    include_refocus: z.boolean(), has_decision: z.boolean(), has_agenda: z.boolean(), has_owner: z.boolean() }).strict(),
  direct_cost: money, refocus_cost: money, refocus_minutes_per_attendee: z.number(),
  total_cost: money, cost_per_minute: money, missing: z.array(z.enum(['agenda','meeting owner'])),
  verdict: z.enum(['MEET','ASYNC','NOT-READY']), exit_code: z.union([z.literal(0),z.literal(2),z.literal(3)]),
  headline: z.string().min(1).max(2000),
}).strict();
export function validateImportedOutput(raw: unknown, files: {name:string;base64:string}[]) {
  const {arguments:a} = importedToolSchema.parse(raw);
  if(files.length !== 1 || files[0].name !== 'meeting-cost.json') throw new Error('Unexpected imported tool artifacts');
  const bytes = Buffer.from(files[0].base64, 'base64');
  if(bytes.length > 10000 || bytes.toString('base64') !== files[0].base64) throw new Error('Invalid imported tool output encoding');
  const r = outputSchema.parse(JSON.parse(bytes.toString('utf8')));
  const {avg_rate}=a;
  if(JSON.stringify(r.inputs) !== JSON.stringify({attendees:a.attendees,minutes:a.minutes,avg_rate_per_hour:avg_rate,include_refocus:a.include_refocus,has_decision:a.has_decision,has_agenda:a.has_agenda,has_owner:a.has_owner}))
    throw new Error('Imported tool input echo mismatch');
  // Cent-level tolerance accommodates Python ties-to-even versus JS rounding.
  const close=(x:number,y:number)=>Math.abs(x-y)<=0.010001;
  const missing=[...(!a.has_agenda?['agenda']:[]),...(!a.has_owner?['meeting owner']:[])];
  const verdict=!a.has_decision?'ASYNC':missing.length?'NOT-READY':'MEET';
  if(!close(r.direct_cost,a.attendees*a.minutes/60*avg_rate) ||
     !close(r.refocus_cost,a.include_refocus?a.attendees*23/60*avg_rate:0) ||
     !close(r.total_cost,r.direct_cost+r.refocus_cost) || !close(r.cost_per_minute,r.total_cost/a.minutes) ||
     r.refocus_minutes_per_attendee !== (a.include_refocus?23:0) || r.verdict !== verdict ||
     r.exit_code !== ({MEET:0,ASYNC:2,'NOT-READY':3}[verdict]) || JSON.stringify(r.missing)!==JSON.stringify(missing))
    throw new Error('Imported tool result failed independent checks');
  return {...importedToolProvenance, inputHash:createHash('sha256').update(JSON.stringify(a)).digest('hex'),
    outputHash:createHash('sha256').update(bytes).digest('hex')};
}
