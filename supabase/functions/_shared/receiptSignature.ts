// Server-only utility. Compatible with Node 20+ and Supabase Edge (Web Crypto).
const encoder = new TextEncoder();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function key(secret: string) {
  if (encoder.encode(secret).length < 32) throw new Error('Receipt signing secret must have at least 32 bytes');
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function signReceipt(id: string, secret: string): Promise<string> {
  if (!uuid.test(id)) throw new Error('Invalid receipt ID');
  const payload = `v1.${id}`;
  const signature = await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(payload));
  return `${payload}.${Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, '0')).join('')}`;
}
export async function verifyReceipt(token: string, secret: string): Promise<string | null> {
  if (typeof token !== 'string' || token.length !== 104) return null;
  const [version, id, signature] = token.split('.');
  if (version !== 'v1' || !uuid.test(id) || !/^[0-9a-f]{64}$/.test(signature)) return null;
  const bytes = Uint8Array.from(signature.match(/../g)!, x => parseInt(x, 16));
  return await crypto.subtle.verify('HMAC', await key(secret), bytes, encoder.encode(`${version}.${id}`)) ? id : null;
}
