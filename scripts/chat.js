const launcher = document.querySelector('#chat-launcher');
const panel = document.querySelector('#chat-panel');
const closeButton = document.querySelector('#chat-close');
const form = document.querySelector('#chat-form');
const input = document.querySelector('#chat-input');
const sendButton = document.querySelector('#chat-send');
const messages = document.querySelector('#chat-messages');
const status = document.querySelector('#chat-status');
const suggestions = [...document.querySelectorAll('[data-question]')];
let pending = null;

function syncControls() {
  input.disabled = Boolean(pending);
  sendButton.disabled = input.disabled;
  sendButton.textContent = pending ? 'Aguarde…' : 'Enviar';
  suggestions.forEach(button => { button.disabled = Boolean(pending); });
}

function setOpen(open) {
  panel.hidden = !open;
  launcher.hidden = open;
  launcher.setAttribute('aria-expanded', String(open));
  if (open) closeButton.focus();
  else launcher.focus();
}

function appendMessage(role, text) {
  const item = document.createElement('div');
  item.className = `chat-message chat-message-${role}`;
  item.setAttribute('aria-label', role === 'user' ? 'Você' : 'Assistente virtual');
  const content = document.createElement('p');
  // Respostas do modelo são texto não confiável; nunca inserir com innerHTML.
  content.textContent = text;
  item.append(content);
  messages.append(item);
  while (messages.children.length > 41) messages.children[1].remove();
  messages.scrollTop = messages.scrollHeight;
}

launcher.hidden = false;
launcher.addEventListener('click', () => setOpen(true));
closeButton.addEventListener('click', () => setOpen(false));
panel.addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
});
suggestions.forEach(button => button.addEventListener('click', () => {
  input.value = button.dataset.question;
  input.focus();
}));
document.querySelector('#chat-clear').addEventListener('click', () => {
  pending?.abort();
  pending = null;
  while (messages.children.length > 1) messages.lastElementChild.remove();
  input.value = '';
  status.textContent = 'Conversa removida desta página.';
  document.querySelector('.chat-suggestions').hidden = false;
  syncControls();
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  const message = input.value.trim();
  if (pending || !message || message.length > 1500) return;
  const controller = new AbortController();
  pending = controller;
  appendMessage('user', message);
  document.querySelector('.chat-suggestions').hidden = true;
  input.value = '';
  status.textContent = 'Só um instante…';
  syncControls();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
      signal: controller.signal,
      cache: 'no-store'
    });
    const data = await response.json().catch(() => ({}));
    if (pending !== controller) return;
    if (!response.ok) {
      const errors = {
        429: 'Estamos recebendo muitas mensagens. Tente em alguns minutos ou fale com a equipe.',
        503: 'Não conseguimos responder agora. Você pode falar com a equipe pelo link abaixo.',
        504: 'A resposta demorou mais que o esperado. Tente novamente.'
      };
      throw new Error(errors[response.status] || 'Não foi possível obter uma resposta. Tente novamente.');
    }
    if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('A resposta não chegou completa. Tente novamente.');
    appendMessage('assistant', data.reply);
    status.textContent = '';
  } catch (error) {
    if (pending !== controller) return;
    status.textContent = error.name === 'AbortError'
      ? 'Tempo de espera esgotado. Sua pergunta foi recuperada para tentar novamente.'
      : error instanceof TypeError
        ? 'Não foi possível conectar. Verifique sua conexão e tente novamente.'
        : error.message;
    input.value = message;
  } finally {
    clearTimeout(timeout);
    if (pending === controller) {
      pending = null;
      syncControls();
    }
  }
});
input.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    form.requestSubmit();
  }
});
