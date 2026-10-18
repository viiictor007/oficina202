// Lê o relatório .json localmente, mostra o que seria enviado e só envia se o usuário confirmar.
const fileInput = document.getElementById('jsonFile');
const preview = document.getElementById('preview');
const previewText = document.getElementById('previewText');
const fileError = document.getElementById('fileError');
const sendReport = document.getElementById('sendReport');
let resumo = '';

const NIVEL = { problema: 'PROBLEMA', atencao: 'ATENÇÃO', info: 'INFO', ok: 'OK' };

function montarResumo(r) {
  const s = r.sistema || {}, m = r.memoria || {};
  const linhas = [
    `Sistema: ${s.tipo || '?'} ${s.fabricante || ''} ${s.modelo || ''} · ${s.windows || ''}`.trim(),
    `Processador: ${(r.processador || {}).nome || '?'}`,
    `Memória RAM: ${m.totalGB || '?'} GB`,
    `Placa(s) de vídeo: ${(r.placasDeVideo || []).map(g => g.nome).join(', ') || '?'}`,
    `BIOS: ${(r.bios || {}).versao || '?'} (${(r.bios || {}).data || '?'})`,
    '', 'Achados do diagnóstico automático:'
  ];
  for (const a of (r.achados || [])) {
    if (a.nivel === 'ok') { linhas.push(`- [OK] ${a.titulo}`); continue; }
    linhas.push(`- [${NIVEL[a.nivel] || a.nivel}] ${a.area}: ${a.titulo}`);
  }
  return linhas.join('\n').slice(0, 4500);
}

fileInput.addEventListener('change', async () => {
  fileError.hidden = true; preview.hidden = true;
  const file = fileInput.files[0];
  if (!file) return;
  try {
    const txt = (await file.text()).replace(/^﻿/, '');
    const r = JSON.parse(txt);
    if (!r.achados || !r.sistema) throw new Error('formato');
    resumo = montarResumo(r);
    previewText.textContent = resumo;
    preview.hidden = false;
  } catch {
    fileError.textContent = 'Esse arquivo não parece ser um relatório do aplicativo (.json da pasta "relatorios").';
    fileError.hidden = false;
  }
});

sendReport.addEventListener('click', () => {
  if (!resumo || !window.chatSend) return;
  window.chatSend(
    'Rodei o diagnóstico automático do meu computador. Pode me explicar os resultados em linguagem simples e dizer o que devo resolver primeiro?\n\n' + resumo,
    '📄 Enviei o resumo do meu relatório de diagnóstico. Pode me explicar?'
  );
  preview.hidden = true;
  document.querySelector('.chat').scrollIntoView({ behavior: 'smooth', block: 'center' });
});
