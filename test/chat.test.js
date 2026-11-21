import test from 'node:test';
import assert from 'node:assert/strict';
import { createChatHandler } from '../server/chat.js';

const enabled = { CHAT_ENABLED: 'true', GROQ_API_KEY: 'test-only-not-a-real-key' };
async function invoke({ env = enabled, fetchImpl = () => { throw new Error('Unexpected network call'); }, method = 'POST', body = { message: 'Como doar?' }, headers = { 'content-type': 'application/json' } } = {}) {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } };
  await createChatHandler({ env, fetchImpl })({ method, body, headers }, res);
  return res;
}
test('disabled or missing credentials never call provider', async () => {
  assert.equal((await invoke({ env: {} })).code, 503);
  assert.equal((await invoke({ env: { GROQ_API_KEY: 'test' } })).code, 503);
});
test('rejects wrong method, media type, invalid JSON and client instructions', async () => {
  assert.equal((await invoke({ method: 'GET' })).code, 405);
  assert.equal((await invoke({ headers: {} })).code, 415);
  assert.equal((await invoke({ body: '{' })).code, 400);
  for (const body of [{ message: ' ' }, { message: 'x'.repeat(1501) }, { message: 'Oi', role: 'system' }, null]) {
    assert.equal((await invoke({ body })).code, 400);
  }
});
test('sends server context and returns only public reply', async () => {
  const result = await invoke({ fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
    const payload = JSON.parse(options.body);
    assert.equal(payload.model, 'openai/gpt-oss-20b');
    assert.equal(payload.messages[0].role, 'system');
    assert.deepEqual(payload.messages[1], { role: 'user', content: 'Como doar?' });
    return new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: 'Fale com a administração.', reasoning: 'internal' } }] }));
  } });
  assert.equal(result.code, 200);
  assert.deepEqual(result.body, { reply: 'Fale com a administração.' });
  assert.equal(result.headers['Cache-Control'], 'no-store');
});
test('handles quota and does not leak provider errors', async () => {
  assert.equal((await invoke({ fetchImpl: async () => new Response('private details', { status: 429 }) })).code, 429);
  const result = await invoke({ fetchImpl: async () => new Response('private details', { status: 401 }) });
  assert.equal(result.code, 502);
  assert.ok(!JSON.stringify(result.body).includes('private details'));
});
test('handles timeouts and incomplete answers', async () => {
  assert.equal((await invoke({ fetchImpl: async () => { throw new DOMException('timeout', 'TimeoutError'); } })).code, 504);
  assert.equal((await invoke({ fetchImpl: async () => new Response(JSON.stringify({ choices: [{ finish_reason: 'length', message: { content: 'Parcial' } }] })) })).code, 502);
});
