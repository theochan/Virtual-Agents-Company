import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const birth = (pid: number) => execFileSync('/bin/ps', ['-p', String(pid), '-o', 'lstart='], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

/** Serialize stale-lock recovery; never evict a process solely because a timer expired. */
export function acquireWorkspaceLock(directory: string) {
  const file = path.join(directory, 'server.pid');
  const guard = path.join(directory, 'server-lock-recovery');
  let fd: number;
  try { fd = fs.openSync(guard, 'wx', 0o600); }
  catch { throw new Error('Workspace lock recovery is already in progress. If a startup crashed, inspect server-lock-recovery before manual removal'); }
  let own = '';
  try {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      let record: { pid: number; birth?: string };
      try { const parsed = JSON.parse(raw); record = typeof parsed === 'number' ? { pid: parsed } : parsed; }
      catch { throw new Error('Malformed workspace lock; inspect before recovery'); }
      if (!Number.isSafeInteger(record.pid) || record.pid <= 0) throw new Error('Invalid workspace lock PID');
      let alive = true;
      try { process.kill(record.pid, 0); } catch (error: any) { if (error.code === 'ESRCH') alive = false; }
      if (alive && record.birth) {
        const actual = birth(record.pid);
        if (!actual) throw new Error('Cannot verify existing workspace owner');
        alive = actual === record.birth;
      }
      if (alive) throw new Error('This workspace is already open in another server process');
      fs.unlinkSync(file);
    }
    own = JSON.stringify({ pid: process.pid, birth: birth(process.pid) });
    fs.writeFileSync(file, own, { flag: 'wx', mode: 0o600 });
  } finally { fs.closeSync(fd); fs.unlinkSync(guard); }
  return () => { try { if (fs.readFileSync(file, 'utf8') === own) fs.unlinkSync(file); } catch {} };
}
