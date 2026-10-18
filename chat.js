// Chat de diagnóstico. Usa a IA via servidor (/api/chat). Se o servidor ou a chave não estiverem
// disponíveis (ou o site foi aberto direto do arquivo), cai sozinho para o modo demonstração (demo.js).
const box = document.getElementById('chatBox');
const form = document.getElementById('chatForm');
const input = document.getElementById('chatInput');
const sendBtn = document.getElementById('chatSend');
const chips = document.getElementById('chatChips');

const history = []; // {role: 'user'|'assistant', content}
let busy = false;
let demo = location.protocol === 'file:';

function addMsg(role, text) {
  const el = document.createElement('div');
  el.className = 'msg ' + role;
  // Texto seguro (sem HTML) + **negrito** simples
  el.innerHTML = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
  return el;
}

function setChips(lista) {
  chips.innerHTML = '';
  (lista || []).forEach(rotulo => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = rotulo;
    b.addEventListener('click', () => send(rotulo));
    chips.appendChild(b);
  });
  chips.hidden = !(lista && lista.length);
}

function entrarNoModoDemo() {
  demo = true;
  const sub = document.querySelector('.chat-head small');
  if (sub) sub.textContent = 'Modo demonstração · roteiro fixo de perguntas, sem IA';
  addMsg('bot note', '⚙️ **Modo demonstração.** A IA não está conectada (falta ligar o servidor ou configurar a chave), então vou seguir um roteiro fixo de perguntas. As respostas ajudam, mas não são geradas por IA.');
}

async function pedirIA(text) {
  const r = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: history.concat([{ role: 'user', content: text }]) })
  });
  const data = await r.json().catch(() => ({}));
  if (r.status === 429) throw Object.assign(new Error(data.error || 'Muitas mensagens. Aguarde um minuto.'), { limite: true });
  if (!r.ok || !data.reply) throw new Error('indisponível');
  history.push({ role: 'user', content: text }, { role: 'assistant', content: data.reply });
  return data.reply;
}

async function send(text, mostrar) {
  text = text.trim();
  if (!text || busy) return;
  busy = true; sendBtn.disabled = true; setChips([]);
  addMsg('user', mostrar || text);
  input.value = '';

  const typing = addMsg('bot typing', '');
  typing.innerHTML = '<span></span><span></span><span></span>';
  try {
    if (!demo) {
      try {
        const reply = await pedirIA(text);
        typing.remove(); addMsg('bot', reply);
        return;
      } catch (e) {
        if (e.limite) { typing.remove(); addMsg('bot error', e.message); return; }
        entrarNoModoDemo();
      }
    }
    await new Promise(r => setTimeout(r, 600));
    typing.remove();
    const out = window.DemoChat.handle(text);
    addMsg('bot', out.text);
    setChips(out.options);
  } finally {
    busy = false; sendBtn.disabled = false; input.focus();
  }
}

form.addEventListener('submit', e => { e.preventDefault(); send(input.value); });
input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input.value); }
});
chips.querySelectorAll('button').forEach(b => b.addEventListener('click', () => send(b.dataset.q || b.textContent)));

window.chatSend = send; // usado pela página do aplicativo para enviar o resumo do relatório

addMsg('bot', box.dataset.saudacao || 'Olá! Sou a **IA de diagnóstico da Oficina 202**. Me conte o que está acontecendo com o seu computador e eu vou fazendo algumas perguntas para descobrir a causa mais provável.\n\nPor onde começamos?');
if (demo) entrarNoModoDemo();
