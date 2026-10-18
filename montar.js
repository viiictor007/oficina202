// Recomendador de peças: pede a lista à IA, confere compatibilidade e monta atalhos de busca nas lojas.
const form = document.getElementById('buildForm');
const btn = document.getElementById('buildBtn');
const result = document.getElementById('result');

// Lojas de busca (sem preços por enquanto: o botão abre a pesquisa da peça na loja)
const slug = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const LOJAS = [
  { nome: 'Mercado Livre', url: q => 'https://lista.mercadolivre.com.br/' + slug(q) },
  { nome: 'Amazon', url: q => 'https://www.amazon.com.br/s?k=' + encodeURIComponent(q) },
  { nome: 'KaBuM!', url: q => 'https://www.kabum.com.br/busca/' + slug(q) },
  { nome: 'Pichau', url: q => 'https://www.pichau.com.br/search?q=' + encodeURIComponent(q) },
  { nome: 'Terabyte', url: q => 'https://www.terabyteshop.com.br/busca?str=' + encodeURIComponent(q) }
];

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const norm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// Conferência de compatibilidade feita em código (não depende só da IA)
function verificar(pecas) {
  const by = c => pecas.find(p => p.categoria === c);
  const cpu = by('Processador'), mb = by('Placa-mãe'), ram = by('Memória RAM'), gpu = by('Placa de vídeo'), psu = by('Fonte'), cs = by('Gabinete');
  const itens = [];
  const add = (ok, msg) => itens.push({ ok, msg });
  if (cpu?.specs?.socket && mb?.specs?.socket) {
    const ok = norm(cpu.specs.socket) === norm(mb.specs.socket);
    add(ok, ok ? `Processador e placa-mãe usam o mesmo soquete (${cpu.specs.socket}).` : `Soquete incompatível: processador ${cpu.specs.socket} × placa-mãe ${mb.specs.socket}.`);
  }
  if (mb?.specs?.tipoMemoria && ram?.specs?.tipoMemoria) {
    const ok = norm(mb.specs.tipoMemoria) === norm(ram.specs.tipoMemoria);
    add(ok, ok ? `Memória e placa-mãe são ${ram.specs.tipoMemoria}.` : `Tipo de memória incompatível: placa-mãe ${mb.specs.tipoMemoria} × RAM ${ram.specs.tipoMemoria}.`);
  }
  if (mb?.specs?.formato && Array.isArray(cs?.specs?.formatosSuportados)) {
    const ok = cs.specs.formatosSuportados.map(norm).includes(norm(mb.specs.formato));
    add(ok, ok ? `O gabinete comporta a placa-mãe (${mb.specs.formato}).` : `O gabinete pode não comportar a placa-mãe ${mb.specs.formato}.`);
  }
  if (psu?.specs?.potenciaW && (cpu?.specs?.tdpW || gpu?.specs?.consumoW)) {
    const carga = (Number(cpu?.specs?.tdpW) || 0) + (Number(gpu?.specs?.consumoW) || 0) + 100;
    const recomendada = Math.ceil(carga * 1.4 / 50) * 50;
    const ok = Number(psu.specs.potenciaW) >= recomendada;
    add(ok, ok ? `Fonte de ${psu.specs.potenciaW} W com folga para o consumo estimado (~${carga} W em carga).` : `A fonte de ${psu.specs.potenciaW} W pode ficar justa: o consumo estimado é ~${carga} W e o recomendado seria ao menos ${recomendada} W.`);
  }
  return itens;
}

function textoLista(r) {
  const linhas = (r.pecas || []).map(p => `- ${p.categoria}: ${p.nome}`);
  return 'Lista de peças (Oficina 202)\n' + linhas.join('\n');
}

function render(r, pedido) {
  const pecas = r.pecas || [];
  if (!pecas.length) { result.innerHTML = `<div class="empty"><h3>Não foi possível montar a lista</h3><p>${esc(r.resumo || 'Tente descrever melhor o que você precisa.')}</p></div>`; return; }
  const checks = pedido.tipo === 'notebook' ? [] : verificar(pecas);
  const falhas = checks.filter(c => !c.ok).length;

  let h = r.demo ? `<div class="demo-badge">⚙️ <strong>Modo demonstração:</strong> lista montada por regras fixas e um catálogo pequeno, sem IA e sem preços. Com o servidor e a chave configurados, a IA monta a lista sob medida.</div>` : '';
  h += `<div class="res-head"><h2>Sua lista de peças</h2><p>${esc(r.resumo)}</p></div>`;
  if (checks.length) {
    h += `<div class="compat ${falhas ? 'bad' : 'good'}"><strong>${falhas ? '⚠ Atenção à compatibilidade' : '✔ Compatibilidade conferida'}</strong><ul>` +
      checks.map(c => `<li class="${c.ok ? 'pass' : 'fail'}">${c.ok ? '✔' : '✖'} ${esc(c.msg)}</li>`).join('') + '</ul></div>';
  }
  h += '<div class="parts">';
  for (const p of pecas) {
    const q = p.busca || p.nome;
    const chips = Object.entries(p.specs || {}).filter(([, v]) => v !== '' && v != null).map(([k, v]) => {
      const rot = { socket: 'Soquete', tipoMemoria: 'Memória', formato: 'Formato', formatosSuportados: 'Aceita', tdpW: 'TDP', consumoW: 'Consumo', potenciaW: 'Potência' }[k] || k;
      const val = Array.isArray(v) ? v.join('/') : (/W$/.test(k) ? v + ' W' : v);
      return `<span class="chip-s">${rot}: ${esc(val)}</span>`;
    }).join('');
    h += `<article class="part"><div class="part-cat">${esc(p.categoria)}</div><h3>${esc(p.nome)}</h3><p>${esc(p.motivo)}</p>${chips ? `<div class="chips-s">${chips}</div>` : ''}
      <div class="stores"><span>Buscar em:</span>${LOJAS.map(l => `<a href="${esc(l.url(q))}" target="_blank" rel="noopener noreferrer">${l.nome}</a>`).join('')}</div></article>`;
  }
  h += '</div>';
  if ((r.avisos || []).length) h += `<div class="avisos"><strong>Pontos de atenção</strong><ul>${r.avisos.map(a => `<li>${esc(a)}</li>`).join('')}</ul></div>`;
  if (r.dica) h += `<p class="dica">💡 ${esc(r.dica)}</p>`;
  h += `<div class="res-foot"><p><strong>Preços:</strong> esta versão ainda não mostra preços. Os botões abrem a busca da peça em cada loja, e é lá que você compara valores e confere estoque. Confirme sempre a compatibilidade e a disponibilidade antes de comprar: a IA pode errar ou não conhecer lançamentos recentes.</p>
    <div class="res-actions"><button type="button" class="btn btn-small" id="copyBtn">Copiar lista</button></div></div>`;
  result.innerHTML = h;
  document.getElementById('copyBtn').addEventListener('click', e => {
    navigator.clipboard?.writeText(textoLista(r)).then(() => { e.target.textContent = 'Copiado ✔'; });
  });
  result.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  const f = new FormData(form);
  const pedido = Object.fromEntries(f.entries());
  btn.disabled = true; btn.textContent = 'Montando…';
  result.innerHTML = '<div class="empty"><div class="spinner"></div><h3>Analisando seu pedido…</h3><p>Escolhendo peças e conferindo a compatibilidade.</p></div>';
  try {
    let data = null;
    if (location.protocol !== 'file:') {
      try {
        const r = await fetch('/api/recomendar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pedido) });
        const j = await r.json().catch(() => ({}));
        if (r.status === 429 || r.status === 400) throw Object.assign(new Error(j.error || 'Erro'), { final: true });
        if (r.ok) data = j;
      } catch (err) { if (err.final) throw err; }
    }
    // Sem servidor ou sem chave: usa o montador de demonstração (regras fixas, sem IA)
    await new Promise(r => setTimeout(r, 500));
    render(data || window.DemoBuild.generate(pedido), pedido);
  } catch (err) {
    result.innerHTML = `<div class="empty"><h3>Não deu certo desta vez</h3><p>${esc(err.message)}</p></div>`;
  } finally { btn.disabled = false; btn.textContent = 'Montar minha lista'; }
});
