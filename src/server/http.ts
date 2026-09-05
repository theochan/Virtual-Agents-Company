/** Bound provider-controlled response bodies before JSON parsing. */
export async function readJson(response: Response, limit = 1_000_000): Promise<any> {
  if (Number(response.headers.get('content-length')) > limit) throw new Error('Provider response exceeds size limit');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Provider response has no body');
  let size = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error('Provider response exceeds size limit');
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally { await reader.cancel().catch(() => {}); }
}
