# Viver Limpo — ambiente para IA

Site estático existente com backend preparado para Vercel Functions e Groq.
O painel de chat está disponível no botão flutuante “Podemos ajudar?”.
Os detalhes estão em “Sobre este chat e privacidade”. As sugestões apenas preenchem o campo; envie pelo botão ou com Enter (Shift+Enter quebra a linha).
Cada pergunta é independente. A conversa fica somente na memória da página; limpar cancela a espera em andamento e remove as mensagens locais.
O modelo padrão é `openai/gpt-oss-20b`. Não é necessário hospedar o modelo.

## Desenvolvimento local

Use Node.js 24 LTS (versão configurada para a Vercel). Não há pacotes externos para instalar.
No PowerShell, dentro da pasta `viver_limpo`:

```powershell
Copy-Item .env.example .env
npm run dev
```

O comando aceita `.env` e `.env.local`; se ambos existirem, `.env.local` tem prioridade. Não duplique chaves desnecessariamente.
Copie o exemplo apenas se ainda não houver um arquivo de configuração. Edite esse arquivo no seu editor:

- `GROQ_API_KEY`: chave gerada no console da Groq; nunca enviar no chat ou colocar no frontend.
- `GROQ_MODEL`: manter o padrão ou escolher um modelo disponível na sua conta.
- `CHAT_ENABLED`: mudar para `true` quando estiver pronto para consultar a API.

Sem configuração, o site abre normalmente e a API responde 503, sem chamar a Groq.
Abra `http://127.0.0.1:3000`. Reinicie o comando após mudanças nos arquivos ou variáveis.
O servidor local escuta apenas neste computador. Ctrl+C encerra o processo.

Para testar a API real depois da configuração, em outro terminal:

```powershell
$body = @{ message = 'Como posso ajudar com uma doação?' } | ConvertTo-Json
Invoke-RestMethod -Uri http://127.0.0.1:3000/api/chat -Method Post -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body))
```

Não há resposta simulada no aplicativo: uma resposta 200 exige consulta real à Groq.

## Verificação sem chave

```powershell
npm test
npm run build
```

Os testes simulam o provedor e não enviam dados nem consomem cota.
O build copia somente `index.html`, `style/`, `scripts/` e `images/` para `dist/`.
Não coloque segredos nessas pastas públicas. `.env`, backend e testes não entram no build estático.

## Vercel e GitHub

1. Envie o repositório desta pasta ao GitHub; revise o diff antes do commit.
2. Na Vercel, importe o repositório. Se ele contiver a pasta `viver_limpo`, selecione-a como Root Directory; se o repositório já começar nela, mantenha a raiz.
3. Use Framework Preset **Other**, Node.js **24.x**, Build Command `npm run build` e Output Directory `dist` (também definidos em `vercel.json`).
4. Cadastre `GROQ_API_KEY`, `GROQ_MODEL` e `CHAT_ENABLED` em Settings → Environment Variables. Não use prefixo `PUBLIC` ou `NEXT_PUBLIC`.
5. Inicialmente mantenha `CHAT_ENABLED=false` em Production. Ative apenas no ambiente restrito usado pelos avaliadores.
6. Ative a proteção de implantação disponível na Vercel para os testes. Após alterar variáveis, faça novo deploy.

A função `api/chat.js` é descoberta pela Vercel separadamente dos arquivos de `dist/`.
Nenhuma publicação, conta, chave ou configuração remota é criada por estes arquivos.

## Contrato da API

`POST /api/chat`, com `Content-Type: application/json`:

```json
{ "message": "Como funciona a rotina da casa?" }
```

Sucesso: `{ "reply": "..." }`. Falha: `{ "error": "..." }`.
Limite de 1500 caracteres por pergunta, resposta limitada a 1024 tokens de conclusão e timeout de 20 segundos.
Esta primeira versão é sem histórico; só aceita a pergunta, sem papéis ou instruções do cliente.
O frontend futuro deve renderizar `reply` como texto (`textContent`), nunca como HTML confiável.

## Privacidade e limites desta preparação

- Ative Zero Data Retention no console da Groq. O código não ativa nem verifica essa configuração.
- A aplicação não salva conversas nem registra seus conteúdos. Isso não controla os metadados ou políticas dos provedores.
- Na publicação, as mensagens passam pela Vercel e pela Groq. Verifique os termos de ambas antes de receber dados reais; use perguntas fictícias no protótipo.
- O conteúdo institucional fica em `server/context.js`; revise com a administração.
- Instruções ao modelo reduzem riscos, mas não garantem respostas corretas ou prevenção de prompt injection.
- Não há autenticação nem limite distribuído de requisições nesta preparação. A cota da Groq não substitui controle de abuso. Mantenha o teste protegido; antes de abrir o chat ao público, implemente rate limiting/antibot, aviso de privacidade e testes do atendimento.
- A interface inclui aviso sobre processamento externo, estados de erro e contato humano. O aviso não substitui uma política de privacidade revisada para uso público.

Referências: [Groq — dados](https://console.groq.com/docs/your-data), [Groq — cotas](https://console.groq.com/docs/rate-limits), [Vercel Functions](https://vercel.com/docs/functions/runtimes/node-js).
