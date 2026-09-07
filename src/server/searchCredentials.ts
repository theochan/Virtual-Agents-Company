import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { z } from 'zod';
import { Store } from './store';
import { setSearchKey } from './providers';

const schema = z.object({ tavily: z.string().max(4096).optional(), brave: z.string().max(4096).optional() }).strict();

/** Local owner-only file, deliberately separate from portable database backups. */
export class SearchCredentials {
  private readonly file: string;
  private keys: z.infer<typeof schema>;
  constructor(directory: string, store: Store) {
    this.file = path.join(directory, 'search-credentials.json');
    this.keys = fs.existsSync(this.file) ? schema.parse(JSON.parse(fs.readFileSync(this.file, 'utf8'))) : {};
    if (fs.existsSync(this.file)) fs.chmodSync(this.file, 0o600);
    const legacy = store.get<any>('settings', 'search');
    if (legacy?.tavilyApiKey !== undefined || legacy?.braveApiKey !== undefined) {
      this.save({
        ...this.keys,
        ...(this.keys.tavily === undefined && legacy.tavilyApiKey ? { tavily: legacy.tavilyApiKey } : {}),
        ...(this.keys.brave === undefined && legacy.braveApiKey ? { brave: legacy.braveApiKey } : {}),
      });
      store.put('settings', 'search', { activeProvider: legacy.activeProvider || 'auto' });
    }
    for (const provider of ['tavily', 'brave'] as const) {
      // Explicit saved values (including removal) override environment defaults.
      if (this.keys[provider] !== undefined) setSearchKey(provider, this.keys[provider]!);
    }
  }
  update(update: { tavily?: string; brave?: string }) {
    this.save({ ...this.keys, ...update });
    for (const provider of ['tavily', 'brave'] as const) {
      if (update[provider] !== undefined) setSearchKey(provider, update[provider]!);
    }
  }
  private save(value: z.infer<typeof schema>) {
    const keys = schema.parse(value);
    const temporary = `${this.file}.${crypto.randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temporary, JSON.stringify(keys), { mode: 0o600, flag: 'wx' });
      fs.renameSync(temporary, this.file);
      this.keys = keys;
    } finally {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
  }
}
