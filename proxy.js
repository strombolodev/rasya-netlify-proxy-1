const MODELS = {
  'kling-2.6-std': { create: 'https://api.magnific.com/v1/ai/video/kling-v2-6-motion-control-std', status: 'https://api.magnific.com/v1/ai/image-to-video/kling-v2-6/{taskId}' },
  'kling-2.6-pro': { create: 'https://api.magnific.com/v1/ai/video/kling-v2-6-motion-control-pro', status: 'https://api.magnific.com/v1/ai/image-to-video/kling-v2-6/{taskId}' },
  'kling-3-std': { create: 'https://api.magnific.com/v1/ai/video/kling-v3-motion-control-std', status: 'https://api.magnific.com/v1/ai/video/kling-v3-motion-control-std/{taskId}' },
  'kling-3-pro': { create: 'https://api.magnific.com/v1/ai/video/kling-v3-motion-control-pro', status: 'https://api.magnific.com/v1/ai/video/kling-v3-motion-control-pro/{taskId}' },
};
const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,x-proxy-api-key', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
const out = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
async function callMagnific(url, apiKey, payload) {
  const res = await fetch(url, { method: payload ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', 'x-magnific-api-key': apiKey }, body: payload ? JSON.stringify(payload) : undefined });
  const text = await res.text(); let data; try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 1000) }; }
  return out(res.status, data);
}
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  const apiKey = String(event.headers['x-proxy-api-key'] || event.headers['X-Proxy-Api-Key'] || '').trim();
  if (!apiKey) return out(401, { error: 'missing x-proxy-api-key' });
  const raw = event.path.split('/.netlify/functions/proxy').pop() || '/';
  const parts = raw.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  if (parts[0] === 'validate') return out(200, { ok: true, proxy: 'netlify-function' });
  if (parts[0] === 'generate') {
    if (event.httpMethod !== 'POST') return out(405, { error: 'method not allowed' });
    const body = JSON.parse(event.body || '{}'); const model = String(body.model || '');
    if (!MODELS[model]) return out(400, { error: 'invalid model' });
    delete body.model; return callMagnific(MODELS[model].create, apiKey, body);
  }
  if (parts[0] === 'status') {
    const taskId = parts[1] || ''; const model = parts[2] || '';
    if (!taskId) return out(400, { error: 'taskId required' });
    if (!MODELS[model]) return out(400, { error: 'invalid model' });
    return callMagnific(MODELS[model].status.replace('{taskId}', encodeURIComponent(taskId)), apiKey, null);
  }
  return out(200, { ok: true, endpoints: ['/validate', '/generate', '/status/:taskId/:model'] });
};
