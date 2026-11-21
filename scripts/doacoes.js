const shareButton = document.querySelector('#share-donation');
const shareStatus = document.querySelector('#share-status');
const pixButton = document.querySelector('#copy-pix');
const pixStatus = document.querySelector('#pix-status');
pixButton.addEventListener('click', async () => {
  const key = document.querySelector('#pix-key').dataset.copyValue;
  try {
    await navigator.clipboard.writeText(key);
    pixStatus.textContent = 'Chave copiada. Confira o recebedor no seu banco antes de confirmar.';
  } catch {
    pixStatus.textContent = `Copie a chave: ${key}`;
  }
});
shareButton.hidden = false;
shareButton.addEventListener('click', async () => {
  const url = new URL('doacoes.html', window.location.href).href;
  try {
    await navigator.clipboard.writeText(url);
    shareStatus.textContent = 'Link copiado. Compartilhe com quem quiser apoiar.';
  } catch {
    shareStatus.textContent = `Copie este endereço para compartilhar: ${url}`;
  }
});
