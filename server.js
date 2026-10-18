// Servidor do site + ponte segura para a IA. Sem dependências: só Node 18+.
// Uso: defina ANTHROPIC_API_KEY (no arquivo .env) e rode "node server.js".
const http = require('http');
const fs = require('fs');
const path = require('path');

// Carrega .env simples (CHAVE=valor)
try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/).forEach(l => {
    const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
} catch {}

const PORT = process.env.PORT || 3000;
const MODEL = process.env.MODEL || 'claude-sonnet-5-5';
const API_KEY = process.env.ANTHROPIC_API_KEY;
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const PROMPT_CHAT = read('prompt.txt');
const PROMPT_BUILD = read('prompt-recomendador.txt');

// Só estes arquivos são públicos (a chave, o .env e o código do servidor nunca são servidos)
const PUBLIC = {
  '/': 'index.html', '/index.html': 'index.html', '/montar.html': 'montar.html', '/app.html': 'app.html',
  '/style.css': 'style.css', '/script.js': 'script.js', '/chat.js': 'chat.js', '/demo.js': 'demo.js', '/montar.js': 'montar.js', '/app.js': 'app.js'
};
// Downloads do coletor (o .ps1 é texto puro e pode ser conferido antes de rodar)
const DOWNLOADS = { '/diagnostico.ps1': 'diagnostico.ps1', '/diagnostico.bat': 'diagnostico.bat', '/download/diagnostico.ps1': 'diagnostico.ps1', '/download/diagnostico.bat': 'diagnostico.bat' };
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.ps1': 'text/plain; charset=utf-8', '.bat': 'text/plain; charset=utf-8' };

// Limite simples por IP para proteger o seu crédito: 20 chamadas/minuto
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < 60000);
  list.push(now); hits.set(ip, list);
  return list.length > 20;
}

function send(res, code, body, type = 'application/json; charset=utf-8', extra = {}) {
  res.writeHead(code, { 'Content-Type': type, ...extra });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function readJson(req, res) {
  let raw = '';
  for await (const c of req) { raw += c; if (raw.length > 60000) { send(res, 413, { error: 'Mensagem grande demais.' }); return null; } }
  try { return JSON.parse(raw); } catch { send(res, 400, { error: 'Requisição inválida.' }); return null; }
}

async function callClaude(system, messages, maxTokens) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages })
  });
  const data = await r.json();
  if (!r.ok) { console.error('Erro da API:', r.status, data); throw new Error('api'); }
  return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}

function guard(req, res) {
  if (!API_KEY) { send(res, 503, { error: 'Servidor sem chave configurada.' }); return false; }
  if (limited(req.socket.remoteAddress)) { send(res, 429, { error: 'Muitas solicitações. Aguarde um minuto.' }); return false; }
  return true;
}

// Chat de triagem
async function chat(req, res) {
  if (!guard(req, res)) return;
  const body = await readJson(req, res); if (!body) return;
  const msgs = body.messages;
  // Validação: alterna user/assistant, começa com user, tamanhos limitados
  if (!Array.isArray(msgs) || !msgs.length || msgs.length > 40 || msgs[0].role !== 'user' ||
      msgs.some((m, i) => (m.role !== (i % 2 ? 'assistant' : 'user')) || typeof m.content !== 'string' || !m.content.trim() || m.content.length > 6000)) {
    return send(res, 400, { error: 'Conversa inválida.' });
  }
  try { send(res, 200, { reply: await callClaude(PROMPT_CHAT, msgs, 700) }); }
  catch (e) { console.error(e); send(res, 502, { error: 'A IA não respondeu agora. Tente novamente.' }); }
}

// Recomendador de peças
const clip = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
async function recommend(req, res) {
  if (!guard(req, res)) return;
  const b = await readJson(req, res); if (!b) return;
  const orcamento = Number(b.orcamento);
  const tipo = ['desktop', 'notebook', 'upgrade'].includes(b.tipo) ? b.tipo : null;
  if (!tipo || !clip(b.objetivo, 80) || !(orcamento >= 500 && orcamento <= 200000)) return send(res, 400, { error: 'Preencha tipo, objetivo e um orçamento entre R$ 500 e R$ 200.000.' });

  const pedido = [
    `Tipo: ${tipo}`, `Objetivo principal: ${clip(b.objetivo, 80)}`, `Orçamento total: R$ ${orcamento}`,
    `Detalhes do uso: ${clip(b.detalhes, 600) || 'não informado'}`,
    `Peças que já possui: ${clip(b.possui, 400) || 'nenhuma informada'}`,
    `Preferência de processador: ${clip(b.cpuMarca, 20) || 'tanto faz'}`, `Preferência de placa de vídeo: ${clip(b.gpuMarca, 20) || 'tanto faz'}`,
    `Outras preferências: ${clip(b.extras, 300) || 'nenhuma'}`
  ].join('\n');

  try {
    const txt = await callClaude(PROMPT_BUILD, [{ role: 'user', content: pedido }], 2200);
    const m = txt.match(/\{[\s\S]*\}/);
    const json = JSON.parse(m ? m[0] : txt);
    if (!Array.isArray(json.pecas)) throw new Error('formato');
    send(res, 200, json);
  } catch (e) { console.error(e); send(res, 502, { error: 'Não consegui montar a recomendação agora. Tente novamente.' }); }
}

http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (req.method === 'POST' && url === '/api/chat') return chat(req, res);
  if (req.method === 'POST' && url === '/api/recomendar') return recommend(req, res);
  const dl = DOWNLOADS[url];
  const file = PUBLIC[url] || dl;
  if (req.method === 'GET' && file) {
    return fs.readFile(path.join(__dirname, file), (err, buf) => {
      if (err) return send(res, 404, 'Não encontrado', 'text/plain');
      send(res, 200, buf, TYPES[path.extname(file)], dl ? { 'Content-Disposition': `attachment; filename="${file}"` } : {});
    });
  }
  send(res, 404, 'Não encontrado', 'text/plain');
}).listen(PORT, () => {
  console.log(`Site no ar: http://localhost:${PORT}`);
  if (!API_KEY) console.log('ATENÇÃO: ANTHROPIC_API_KEY não definida. O chat e o recomendador vão avisar que estão indisponíveis.');
});
