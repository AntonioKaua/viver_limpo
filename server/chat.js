import { instructions } from './context.js';

export function createChatHandler({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const send = (status, body) => res.status(status).json(body);
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return send(405, { error: 'Use POST para enviar uma pergunta.' });
    }
    if (env.CHAT_ENABLED !== 'true' || !env.GROQ_API_KEY?.trim()) {
      return send(503, { error: 'Assistente ainda não configurado. Fale com a administração.' });
    }
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) {
      return send(415, { error: 'Envie o conteúdo como JSON.' });
    }
    let body = req.body;
    try {
      if (typeof body === 'string') {
        if (Buffer.byteLength(body) > 8192) return send(413, { error: 'Mensagem muito grande.' });
        body = JSON.parse(body);
      }
    } catch {
      return send(400, { error: 'JSON inválido.' });
    }
    // Não aceitamos histórico, papéis ou instruções definidos pelo cliente nesta primeira versão.
    if (!body || Array.isArray(body) || Object.keys(body).some(key => key !== 'message') ||
        typeof body.message !== 'string' || !body.message.trim() || body.message.length > 1500) {
      return send(400, { error: 'Envie apenas message, um texto entre 1 e 1500 caracteres.' });
    }
    try {
      const upstream = await fetchImpl('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          model: env.GROQ_MODEL || 'openai/gpt-oss-20b',
          messages: [
            { role: 'system', content: instructions },
            { role: 'user', content: body.message.trim() }
          ],
          max_completion_tokens: 1024,
          stream: false
        })
      });
      if (upstream.status === 429) {
        res.setHeader('Retry-After', '60');
        return send(429, { error: 'Limite de uso atingido. Tente mais tarde ou fale com a administração.' });
      }
      if (!upstream.ok) return send(502, { error: 'Não foi possível consultar a IA agora.' });
      const data = await upstream.json();
      const choice = data.choices?.[0];
      const reply = choice?.message?.content;
      if (typeof reply !== 'string' || !reply.trim() || choice.finish_reason !== 'stop') {
        return send(502, { error: 'A IA não concluiu uma resposta. Tente uma pergunta mais curta.' });
      }
      return send(200, { reply: reply.trim() });
    } catch (error) {
      // Não registrar perguntas, respostas, credenciais ou corpo de erros do provedor.
      const timedOut = ['TimeoutError', 'AbortError'].includes(error?.name);
      return send(timedOut ? 504 : 502, { error: 'Serviço temporariamente indisponível. Tente mais tarde.' });
    }
  };
}
