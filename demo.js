// MODO DEMONSTRAÇÃO: funciona sem servidor e sem chave de IA.
// Não é IA: o chat segue um roteiro fixo de perguntas e o montador usa regras e um catálogo pequeno.
// Quando o servidor com a chave está disponível, chat.js e montar.js usam a IA de verdade.

/* ======================= CHAT DE DIAGNÓSTICO ======================= */
window.DemoChat = (function () {
  const C = {
    poeira:   { t: 'Acúmulo de poeira e ventilação deficiente', e: 'A poeira entope as entradas de ar e os dissipadores, o calor não sai e o computador reduz a velocidade para se proteger.', p: ['Desligue, tire da tomada e limpe as entradas de ar e as ventoinhas com um pincel macio e ar comprimido.', 'Em notebook, evite usar sobre cama, sofá ou colo e considere uma base com ventilação.'] },
    pasta:    { t: 'Pasta térmica ressecada', e: 'A pasta entre o processador e o dissipador resseca com os anos e deixa de conduzir o calor, principalmente em computadores com mais de 3 anos.', p: ['Troque a pasta térmica (exige abrir o equipamento: se não tiver experiência, leve a uma assistência de confiança).', 'Enquanto isso, evite jogos e programas pesados.'] },
    ventilacao: { t: 'Fluxo de ar do ambiente ou do gabinete', e: 'Espaço fechado, gabinete sem ventilação ou ambiente muito quente impedem o computador de se resfriar.', p: ['Deixe pelo menos 10 cm livres atrás e nas laterais.', 'No desktop, confira se há ventoinhas girando na frente (entrada) e atrás (saída).'] },
    ventoinha: { t: 'Ventoinha com defeito ou travando', e: 'Barulho de raspagem ou ventoinha parada indicam rolamento gasto ou obstrução.', p: ['Verifique se algum cabo encosta na ventoinha.', 'Se o barulho continuar, a ventoinha precisa ser trocada (por você ou por uma assistência de confiança).'] },
    software: { t: 'Programas pesados rodando em segundo plano', e: 'Quando o computador esquenta ou fica lento mesmo parado, geralmente há algo consumindo processador sem você perceber.', p: ['Abra o Gerenciador de Tarefas (Ctrl+Shift+Esc) e veja quem usa mais CPU e memória.', 'Feche ou desinstale o que não reconhece e rode uma verificação com o Microsoft Defender.'] },
    malware:  { t: 'Vírus ou programas indesejados', e: 'Propagandas inesperadas, navegador alterado e lentidão repentina são sinais clássicos.', p: ['Rode uma verificação completa no Microsoft Defender.', 'Desinstale programas que você não reconhece e remova extensões estranhas do navegador.'] },
    startup:  { t: 'Excesso de programas na inicialização e sistema carregado', e: 'Com o tempo, muitos programas passam a abrir junto com o Windows e deixam tudo mais lento.', p: ['No Gerenciador de Tarefas > Inicializar, desative o que não precisa.', 'Desinstale programas que não usa e mantenha o Windows atualizado.'] },
    disco:    { t: 'Disco lento, cheio ou com defeito', e: 'HD mecânico é muito mais lento que SSD, e disco quase cheio ou com falhas causa lentidão e travamentos.', p: ['Faça backup dos arquivos importantes primeiro.', 'Libere espaço (mantenha mais de 15% livre) e, se usa HD, planeje trocar por um SSD.', 'Rode o aplicativo de diagnóstico do site para ver a saúde do disco.'] },
    ram:      { t: 'Memória RAM insuficiente ou com defeito', e: 'Pouca memória faz o Windows usar o disco como "memória de emergência", e pentes defeituosos causam travamentos e telas azuis.', p: ['Veja no Gerenciador de Tarefas > Desempenho se a memória chega perto de 100%.', 'Teste a memória com a "Diagnóstico de Memória do Windows" (digite isso no menu Iniciar).', 'Com 8 GB ou menos, considere subir para 16 GB.'] },
    xmp:      { t: 'Memória fora da velocidade correta (XMP/EXPO) ou em canal único', e: 'A memória costuma rodar abaixo da velocidade anunciada até você ativar o perfil XMP/EXPO na BIOS, e um único pente trabalha em canal único, mais lento.', p: ['Rode o aplicativo de diagnóstico do site: ele mostra a velocidade real da RAM.', 'Ative o XMP/EXPO na BIOS e use dois pentes iguais, se possível.'] },
    driver:   { t: 'Driver ou atualização com problema', e: 'Drivers incompatíveis ou atualizações com falha estão entre as causas mais comuns de travamentos e telas azuis.', p: ['Se começou após uma atualização, use Configurações > Windows Update > Histórico para desinstalar a mais recente.', 'Baixe os drivers de chipset, vídeo e rede direto do site do fabricante.'] },
    gpudrv:   { t: 'Driver de vídeo instável', e: 'Falhas de vídeo em jogos e telas azuis com "VIDEO" no nome costumam ser driver de vídeo corrompido ou desatualizado.', p: ['Reinstale o driver de vídeo com instalação limpa (opção disponível no instalador da NVIDIA/AMD).', 'Desative overclock da placa, se houver.'] },
    fonte:    { t: 'Fonte de alimentação no limite ou com problema', e: 'Desligamentos súbitos sob carga e reinícios aleatórios são típicos de fonte fraca ou desgastada.', p: ['Confirme se a potência da fonte é suficiente para as peças atuais.', 'Não abra a fonte: se o problema continuar, teste com outra fonte numa assistência de confiança.'] },
    conexao:  { t: 'Monitor ligado na saída da placa-mãe, e não da placa de vídeo', e: 'É um erro muito comum: com o cabo na placa-mãe, o jogo usa o vídeo fraco do processador e fica com FPS baixíssimo.', p: ['Desligue o PC e passe o cabo do monitor para a saída da placa de vídeo (a que fica numa placa separada, mais embaixo na traseira).', 'Reinicie e teste o jogo de novo.'] },
    energia:  { t: 'Modo de energia limitando o desempenho', e: 'O modo "economia" ou o notebook sem carregador reduzem a velocidade do processador e da placa de vídeo.', p: ['Em Opções de Energia, escolha "Equilibrado" ou "Alto desempenho".', 'Em notebook, jogue sempre com o carregador na tomada.'] }
  };

  const T = {
    lento: { nome: 'Computador lento', qs: [
      { q: 'Desde quando está lento?', o: [['Sempre foi assim', { disco: 1, ram: 1 }], ['Foi piorando aos poucos', { startup: 2, disco: 1, poeira: 1 }], ['Começou de repente', { malware: 2, driver: 1 }]] },
      { q: 'Onde você mais sente a lentidão?', o: [['Ao ligar e abrir programas', { disco: 2, startup: 1 }], ['Em tudo, até no navegador', { ram: 2, malware: 1, startup: 1 }], ['Só em jogos e programas pesados', { poeira: 1, gpudrv: 1, energia: 1 }]] },
      { q: 'Seu computador usa SSD ou HD mecânico?', o: [['SSD', { ram: 1 }], ['HD mecânico', { disco: 3 }], ['Não sei', { disco: 1 }]] },
      { q: 'Ele esquenta ou a ventoinha fica muito barulhenta?', o: [['Sim', { poeira: 3 }], ['Não', {}]] },
      { q: 'Aparecem propagandas ou programas que você não instalou?', o: [['Sim', { malware: 3 }], ['Não', {}]] }
    ] },
    trava: { nome: 'Trava ou reinicia', qs: [
      { q: 'O que acontece exatamente?', o: [['Desliga ou reinicia de repente', { fonte: 2, poeira: 2 }], ['A imagem congela e preciso forçar', { driver: 1, ram: 1, disco: 1 }], ['Só um programa fecha ou trava', { driver: 1, malware: 1, startup: 1 }]] },
      { q: 'Quando costuma acontecer?', o: [['Em jogos ou uso pesado', { poeira: 2, fonte: 2, gpudrv: 1 }], ['Aleatório, até parado', { ram: 2, disco: 1, fonte: 1 }], ['Logo depois de ligar', { disco: 2, fonte: 1 }]] },
      { q: 'Mudou algo antes de começar?', o: [['Instalei uma peça nova', { fonte: 2, ram: 1 }], ['Atualizei o Windows ou drivers', { driver: 3 }], ['Nada que eu lembre', {}]] },
      { q: 'O computador fica muito quente ou a ventoinha fica barulhenta?', o: [['Sim', { poeira: 3 }], ['Não', {}]] },
      { q: 'Os arquivos demoram a abrir ou o disco faz barulho de clique?', o: [['Sim', { disco: 3 }], ['Não', {}]] }
    ] },
    esquenta: { nome: 'Esquenta ou faz barulho', qs: [
      { q: 'É desktop ou notebook?', o: [['Desktop', { ventilacao: 1 }], ['Notebook', { poeira: 1, ventilacao: 1 }]] },
      { q: 'Como está a ventoinha?', o: [['Gira alto o tempo todo', { poeira: 2, software: 1, pasta: 1 }], ['Faz barulho estranho ou raspando', { ventoinha: 4 }], ['Quase não ouço', { pasta: 1 }]] },
      { q: 'Quando esquenta?', o: [['Mesmo sem fazer nada', { software: 3, pasta: 1 }], ['Só em jogos ou uso pesado', { poeira: 1, pasta: 2, ventilacao: 1 }]] },
      { q: 'Qual a idade do computador e quando foi limpo por dentro?', o: [['Mais de 3 anos, nunca limpei', { pasta: 3, poeira: 3 }], ['Menos de 3 anos, nunca limpei', { poeira: 3 }], ['Limpei há pouco tempo', { pasta: 2 }]] },
      { q: 'Onde ele fica?', o: [['Em espaço fechado, cama ou sofá', { ventilacao: 3 }], ['Em mesa, ambiente aberto', {}]] }
    ] },
    azul: { nome: 'Tela azul', qs: [
      { q: 'Com que frequência aparece?', o: [['Uma vez só', { driver: 1 }], ['Algumas vezes', { driver: 1, ram: 1 }], ['Toda hora', { ram: 2, disco: 1 }]] },
      { q: 'Começou depois de quê?', o: [['Atualizar Windows ou drivers', { driver: 3 }], ['Trocar ou instalar uma peça', { ram: 2, fonte: 1 }], ['Sem motivo aparente', { ram: 1, disco: 1 }]] },
      { q: 'Em que situação aparece?', o: [['Em jogos ou uso pesado', { gpudrv: 2, poeira: 1, fonte: 1 }], ['Aleatória, mesmo parado', { ram: 2, disco: 1 }]] },
      { q: 'Você anotou o código que aparece na tela azul?', o: [['MEMORY_MANAGEMENT ou PAGE_FAULT', { ram: 4 }], ['DRIVER_IRQL ou SYSTEM_SERVICE_EXCEPTION', { driver: 4 }], ['VIDEO_TDR_FAILURE', { gpudrv: 4 }], ['WHEA_UNCORRECTABLE_ERROR', { fonte: 1, poeira: 1, ram: 1 }], ['Não anotei ou é outro', {}]] },
      { q: 'Antes disso o computador estava lento ou os arquivos demoravam a abrir?', o: [['Sim', { disco: 3 }], ['Não', {}]] }
    ] },
    jogos: { nome: 'Poucos FPS em jogos', qs: [
      { q: 'Seu computador é desktop com placa de vídeo dedicada?', o: [['Sim, desktop com placa de vídeo', { conexao: 2 }], ['Notebook', { energia: 2 }], ['Não tenho placa de vídeo dedicada', {}]] },
      { q: 'Em qual saída o cabo do monitor está ligado (desktop)?', o: [['Na placa de vídeo (a placa separada)', {}], ['Na placa-mãe (junto das entradas USB)', { conexao: 6 }], ['Não sei', { conexao: 2 }]] },
      { q: 'O jogo já rodou melhor antes?', o: [['Sim, piorou com o tempo', { poeira: 2, pasta: 1, gpudrv: 1 }], ['Sempre foi assim', { xmp: 2, ram: 1 }]] },
      { q: 'O computador esquenta muito ou a ventoinha fica no máximo?', o: [['Sim', { poeira: 3, pasta: 1 }], ['Não', {}]] },
      { q: 'Você já ativou o XMP/EXPO da memória ou usa dois pentes de RAM?', o: [['Não ou não sei', { xmp: 3 }], ['Sim, já ativei', {}]] }
    ] }
  };

  const KEYS = [
    ['jogos', /fps|jog(o|ar|ando)|game|rodar/i], ['azul', /azul|bsod/i], ['esquenta', /esquent|quente|temperatura|barulh|ventoinha|cooler|ru[ií]do/i],
    ['trava', /trav|congel|reinici|desliga|reboot/i], ['lento', /lent|devagar|demor|pesado/i]
  ];
  const ROTULO = { lento: 'Está muito lento', trava: 'Trava ou reinicia', esquenta: 'Esquenta e faz barulho', azul: 'Tela azul', jogos: 'Poucos FPS em jogos' };
  const INICIO = Object.values(ROTULO);

  let st = null;
  const reset = () => { st = null; };

  function pergunta() {
    const q = T[st.topic].qs[st.i];
    return { text: `**Pergunta ${st.i + 1} de ${T[st.topic].qs.length}**\n${q.q}`, options: q.o.map(x => x[0]) };
  }

  function conclusao() {
    const ranked = Object.entries(st.sc).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    reset();
    if (!ranked.length) return { text: 'Com essas respostas não consegui apontar uma causa clara. Rode o **aplicativo de diagnóstico** do site (menu acima): ele lê o computador e mostra o que há de errado.', options: INICIO };
    const [id, s1] = ranked[0], s2 = ranked[1] ? ranked[1][1] : 0, d = s1 - s2;
    const conf = s1 >= 7 && d >= 4 ? 'alta' : (s1 >= 4 && d >= 2 ? 'média' : 'baixa');
    const main = C[id];
    const outras = ranked.slice(1, 3).map(([k]) => C[k].t);
    return {
      text: '**Pré-diagnóstico**\n' +
        `**Causa mais provável:** ${main.t}. ${main.e}\n` +
        (outras.length ? `**Outras possibilidades:** ${outras.join('; ')}\n` : '') +
        `**Confiança:** ${conf}. Este resultado vem de um roteiro fixo de perguntas, então trate como um ponto de partida.\n` +
        `**O que fazer agora:**\n${main.p.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n` +
        '**Para confirmar:** rode o **aplicativo de diagnóstico** do site, que lê BIOS, drivers, memória, disco, temperaturas e erros do Windows no seu computador. Defeito físico só se confirma testando ou trocando a peça.',
      options: ['Fazer outro diagnóstico']
    };
  }

  // ---- Relatório enviado pela página do aplicativo ----
  const DICAS = {
    'Disco': 'Faça backup dos arquivos importantes antes de qualquer outra coisa e libere espaço no disco.',
    'Estabilidade': 'Atualize drivers (principalmente de vídeo), teste a memória RAM e confira as temperaturas.',
    'Hardware': 'Desfaça overclock ou undervolt, se houver, e teste a memória e o processador (ex.: MemTest86).',
    'Temperatura': 'Limpe poeira e ventoinhas e confira a ventilação; considere trocar a pasta térmica.',
    'Memória RAM': 'Ative o XMP/EXPO na BIOS e, se tiver pouca RAM, considere aumentar para 16 GB.',
    'Placa de vídeo': 'Atualize o driver de vídeo direto do site da NVIDIA, AMD ou Intel.',
    'Drivers': 'Reinstale os drivers dos dispositivos com erro, baixando do site do fabricante.',
    'Segurança': 'Ative o Microsoft Defender (ou outro antivírus) e atualize as definições.',
    'Windows': 'Instale as atualizações pendentes em Configurações > Windows Update e reinicie.',
    'Energia': 'Troque o plano de energia para "Equilibrado" ou "Alto desempenho".',
    'Bateria': 'Se a autonomia incomoda, avalie trocar a bateria.',
    'BIOS': 'Só atualize se houver motivo (compatibilidade ou correção) e siga o guia do fabricante com a energia estável.',
    'Desempenho': 'Desative programas desnecessários na inicialização.',
    'Sistema': 'Reinicie o computador de vez em quando.'
  };
  function relatorio(texto) {
    const itens = [...texto.matchAll(/^- \[(PROBLEMA|ATENÇÃO|INFO|OK)\]\s*(?:([^:\n]+):\s*)?(.+)$/gm)].map(m => ({ n: m[1], area: (m[2] || '').trim(), t: m[3].trim() }));
    const por = n => itens.filter(i => i.n === n);
    const prob = por('PROBLEMA'), aten = por('ATENÇÃO'), info = por('INFO'), ok = por('OK');
    const lista = a => a.map(i => `• ${i.area ? i.area + ': ' : ''}${i.t}${DICAS[i.area] ? `\n   → ${DICAS[i.area]}` : ''}`).join('\n');
    let r = `**Resumo do seu relatório**\n${prob.length} problema(s), ${aten.length} ponto(s) de atenção, ${info.length} informação(ões) e ${ok.length} item(ns) em ordem.\n`;
    if (prob.length) r += `\n**Resolva primeiro (problemas):**\n${lista(prob)}\n`;
    if (aten.length) r += `\n**Depois (pontos de atenção):**\n${lista(aten)}\n`;
    if (info.length) r += `\n**Para conhecer (sem urgência):**\n${info.map(i => `• ${i.area ? i.area + ': ' : ''}${i.t}`).join('\n')}\n`;
    if (!prob.length && !aten.length) r += '\nNenhum problema relevante foi encontrado nesta leitura. 👍\n';
    return { text: r + '\nEste resumo segue regras fixas (modo demonstração) e não substitui testar a peça para confirmar um defeito.', options: [] };
  }

  function handle(text) {
    if (/Achados do diagnóstico automático/i.test(text)) return relatorio(text);
    if (st) {
      const q = T[st.topic].qs[st.i];
      const hit = q.o.find(x => x[0] === text);
      if (hit) {
        for (const [k, v] of Object.entries(hit[1])) st.sc[k] = (st.sc[k] || 0) + v;
        st.i++;
        return st.i >= T[st.topic].qs.length ? conclusao() : pergunta();
      }
      return { text: 'Escolha uma das opções abaixo para eu continuar.\n\n' + pergunta().text, options: pergunta().options };
    }
    if (/mont(ar|agem)|pe[çc]as|pc novo|comprar|upgrade/i.test(text)) {
      return { text: 'Para escolher peças e montar um PC, use a página **Montar meu PC** (no menu acima). Aqui eu cuido de diagnóstico de problemas. Quer fazer um diagnóstico?', options: INICIO };
    }
    const k = KEYS.find(([, re]) => re.test(text));
    if (k) { st = { topic: k[0], i: 0, sc: {} }; const p = pergunta(); return { text: `Entendi: **${T[k[0]].nome}**. Vou fazer ${T[k[0]].qs.length} perguntas rápidas.\n\n${p.text}`, options: p.options }; }
    return { text: 'No modo demonstração eu entendo estes temas. Escolha qual se parece mais com o seu problema:', options: INICIO };
  }
  // chips iniciais ("Está muito lento" etc.) também entram por palavras-chave
  const ALIAS = { 'Está muito lento': 'lento', 'Trava ou reinicia': 'trava', 'Esquenta e faz barulho': 'esquenta', 'Tela azul': 'azul', 'Poucos FPS em jogos': 'jogos' };
  const handleOuter = text => {
    if (!st && ALIAS[text]) { st = { topic: ALIAS[text], i: 0, sc: {} }; const p = pergunta(); return { text: `Certo: **${T[st.topic].nome}**. Vou fazer ${T[st.topic].qs.length} perguntas rápidas.\n\n${p.text}`, options: p.options }; }
    return handle(text);
  };
  return { handle: handleOuter, reset, inicio: INICIO };
})();

/* ======================= MONTADOR DE PECAS ======================= */
window.DemoBuild = (function () {
  const CPU = {
    r5_5600:   { nome: 'AMD Ryzen 5 5600', busca: 'Ryzen 5 5600', socket: 'AM4', tdp: 65, mem: 'DDR4', cooler: true, m: 'Processador de 6 núcleos com ótimo custo-benefício e plataforma AM4 barata.' },
    r5_5600g:  { nome: 'AMD Ryzen 5 5600G', busca: 'Ryzen 5 5600G', socket: 'AM4', tdp: 65, mem: 'DDR4', cooler: true, igpu: true, m: 'Tem vídeo integrado capaz: dispensa placa de vídeo no uso do dia a dia e roda jogos leves.' },
    r5_7600:   { nome: 'AMD Ryzen 5 7600', busca: 'Ryzen 5 7600', socket: 'AM5', tdp: 65, mem: 'DDR5', cooler: true, m: 'Ótimo desempenho em jogos e tarefas gerais, com plataforma nova (AM5) que permite upgrades futuros.' },
    r7_7700:   { nome: 'AMD Ryzen 7 7700', busca: 'Ryzen 7 7700', socket: 'AM5', tdp: 65, mem: 'DDR5', cooler: true, m: '8 núcleos eficientes: bom para jogos, streaming e edição.' },
    r7_7800x3d:{ nome: 'AMD Ryzen 7 7800X3D', busca: 'Ryzen 7 7800X3D', socket: 'AM5', tdp: 120, mem: 'DDR5', cooler: false, m: 'Um dos melhores processadores para jogos, graças ao cache 3D.' },
    r9_7900:   { nome: 'AMD Ryzen 9 7900', busca: 'Ryzen 9 7900', socket: 'AM5', tdp: 65, mem: 'DDR5', cooler: true, m: '12 núcleos: ideal para edição de vídeo, renderização e multitarefa pesada.' },
    i5_12400f: { nome: 'Intel Core i5-12400F', busca: 'Core i5 12400F', socket: 'LGA1700', tdp: 65, mem: 'DDR4', cooler: true, m: 'Processador Intel de 6 núcleos com excelente custo-benefício (precisa de placa de vídeo dedicada).' },
    i5_14600k: { nome: 'Intel Core i5-14600K', busca: 'Core i5 14600K', socket: 'LGA1700', tdp: 181, mem: 'DDR5', cooler: false, m: 'Muito desempenho em jogos e produtividade na faixa intermediária da Intel.' },
    i7_14700k: { nome: 'Intel Core i7-14700K', busca: 'Core i7 14700K', socket: 'LGA1700', tdp: 253, mem: 'DDR5', cooler: false, m: '20 núcleos: ótimo para jogos, streaming e edição ao mesmo tempo.' }
  };
  const GPU = {
    rx6600:   { nome: 'Radeon RX 6600', busca: 'RX 6600', w: 132, m: 'Placa de entrada muito eficiente para jogar em Full HD.' },
    rtx3050:  { nome: 'GeForce RTX 3050 8 GB', busca: 'RTX 3050 8GB', w: 130, m: 'Opção NVIDIA de entrada, com DLSS e recursos de criação.' },
    arcb580:  { nome: 'Intel Arc B580', busca: 'Arc B580', w: 190, m: 'Placa da Intel com bom desempenho em Full HD e 12 GB de memória.' },
    rx7600:   { nome: 'Radeon RX 7600', busca: 'RX 7600', w: 165, m: 'Boa para Full HD em ajustes altos.' },
    rtx4060:  { nome: 'GeForce RTX 4060', busca: 'RTX 4060', w: 115, m: 'Eficiente, com DLSS e geração de quadros, ótima para Full HD e criação.' },
    rtx4060ti:{ nome: 'GeForce RTX 4060 Ti 16 GB', busca: 'RTX 4060 Ti 16GB', w: 165, m: 'Os 16 GB de memória de vídeo ajudam em edição, 3D e IA.' },
    rx7800xt: { nome: 'Radeon RX 7800 XT', busca: 'RX 7800 XT', w: 263, m: 'Muito desempenho em jogos de 1440p.' },
    rtx4070s: { nome: 'GeForce RTX 4070 SUPER', busca: 'RTX 4070 SUPER', w: 220, m: 'Desempenho alto em 1440p e boa em criação e IA.' }
  };
  const BOARD = {
    'AM4':             { nome: 'Placa-mãe B550M (mATX, DDR4)', busca: 'placa mae B550M', mem: 'DDR4' },
    'AM5':             { nome: 'Placa-mãe B650M (mATX, DDR5)', busca: 'placa mae B650M', mem: 'DDR5' },
    'LGA1700-DDR4':    { nome: 'Placa-mãe B660M DDR4 (mATX)', busca: 'placa mae B660M DDR4', mem: 'DDR4' },
    'LGA1700-DDR5':    { nome: 'Placa-mãe B760M DDR5 (mATX)', busca: 'placa mae B760M DDR5', mem: 'DDR5' }
  };
  const PSU = [450, 500, 550, 650, 750, 850, 1000];

  function pickGpu(tier, pref, foco) {
    const t = { A: ['rx6600', 'rtx3050', 'arcb580'], B: ['rtx4060', 'rx7600', 'arcb580'], C: [foco === 'criar' ? 'rtx4060ti' : 'rx7800xt', 'rx7800xt', 'rtx4060ti'], D: ['rtx4070s', 'rx7800xt', 'rtx4070s'] }[tier];
    if (pref === 'AMD') return t[0].startsWith('rx') ? t[0] : (tier === 'A' ? 'rx6600' : (tier === 'B' ? 'rx7600' : 'rx7800xt'));
    if (pref === 'NVIDIA') return tier === 'A' ? 'rtx3050' : (tier === 'B' ? 'rtx4060' : (tier === 'C' ? 'rtx4060ti' : 'rtx4070s'));
    if (pref === 'Intel') return (tier === 'A' || tier === 'B') ? 'arcb580' : t[0];
    return t[0];
  }

  function desktop(p) {
    const o = p.objetivo, orc = Number(p.orcamento), intel = p.cpuMarca === 'Intel';
    const avisos = [];
    const jogo = /Jogos|streaming/i.test(o), criar = /edi[çc][ãa]o|3D|intelig/i.test(o), leve = !jogo && !criar;
    let cpu, gpu = null, ramGB = 16, ssd = '500 GB', foco = jogo ? 'jogar' : 'criar';

    if (leve) {
      ramGB = /Programa/i.test(o) && orc >= 6000 ? 32 : 16; ssd = orc >= 3500 ? '1 TB' : '500 GB';
      cpu = intel ? CPU.i5_12400f : (orc < 3500 ? CPU.r5_5600g : CPU.r5_7600);
      if (intel) avisos.push('O Core i5-12400F não tem vídeo integrado: inclui uma placa de vídeo simples abaixo.');
      if (intel) gpu = GPU.rx6600;
    } else if (jogo) {
      let tier = orc < 4500 ? 'A' : orc < 7500 ? 'B' : orc < 11000 ? 'C' : 'D';
      if (orc < 2800) { cpu = CPU.r5_5600g; avisos.push('Com este orçamento, uma placa de vídeo dedicada não cabe. O Ryzen 5 5600G roda jogos leves e esports em baixa qualidade; considere peças usadas para jogar mais.'); }
      else {
        cpu = intel ? (tier === 'A' || tier === 'B' ? CPU.i5_12400f : (tier === 'C' ? CPU.i5_14600k : CPU.i7_14700k)) : (tier === 'A' ? CPU.r5_5600 : tier === 'B' ? CPU.r5_7600 : CPU.r7_7800x3d);
        gpu = GPU[pickGpu(tier, p.gpuMarca, 'jogar')];
        if (p.gpuMarca === 'Intel' && (tier === 'C' || tier === 'D')) avisos.push('A Intel Arc não chega a esta faixa de desempenho, então indiquei outra marca.');
      }
      ramGB = 16; ssd = orc >= 7500 ? '1 TB' : '500 GB';
    } else {
      const tier = orc < 5500 ? 'B' : orc < 9000 ? 'C' : 'D';
      cpu = intel ? (tier === 'B' ? CPU.i5_12400f : tier === 'C' ? CPU.i5_14600k : CPU.i7_14700k) : (tier === 'B' ? CPU.r5_7600 : tier === 'C' ? CPU.r7_7700 : CPU.r9_7900);
      gpu = GPU[pickGpu(tier === 'B' ? 'B' : tier === 'C' ? 'C' : 'D', p.gpuMarca === 'AMD' ? 'AMD' : (p.gpuMarca || 'NVIDIA'), 'criar')];
      ramGB = tier === 'B' ? 16 : 32; ssd = tier === 'D' ? '2 TB' : '1 TB';
      if (tier === 'B') avisos.push('Para edição, 32 GB de RAM é o ideal. Com este orçamento comecei com 16 GB e deixei espaço para ampliar.');
      if (/intelig/i.test(o) && gpu.w < 160) avisos.push('Para IA, a memória de vídeo (VRAM) é o fator mais importante: prefira placas NVIDIA com 12 GB ou mais.');
    }

    const placa = BOARD[cpu.socket === 'LGA1700' ? 'LGA1700-' + cpu.mem : cpu.socket];
    const ramTipo = placa.mem;
    const kit = ramTipo === 'DDR5' ? `Kit 2x${ramGB / 2} GB DDR5 6000 MHz (perfil EXPO/XMP)` : `Kit 2x${ramGB / 2} GB DDR4 3200 MHz`;
    const carga = cpu.tdp + (gpu ? gpu.w : 0) + 100;
    const rec = Math.ceil(carga * 1.4 / 50) * 50;
    const w = PSU.find(x => x >= rec) || 1000;

    const pecas = [
      { categoria: 'Processador', nome: cpu.nome, busca: cpu.busca, motivo: cpu.m, specs: { socket: cpu.socket, tdpW: cpu.tdp } },
      { categoria: 'Placa-mãe', nome: placa.nome, busca: placa.busca, motivo: `Compatível com o ${cpu.nome.replace(/^(AMD|Intel) /, '')} e com memória ${ramTipo}. Confira se a BIOS da placa já aceita o processador (placas antigas podem precisar de atualização).`, specs: { socket: cpu.socket, tipoMemoria: ramTipo, formato: 'mATX' } },
      { categoria: 'Memória RAM', nome: kit, busca: `memoria ${ramTipo} ${ramGB}GB`, motivo: 'Dois pentes iguais ativam o canal duplo, que melhora o desempenho. Lembre de ativar o XMP/EXPO na BIOS.', specs: { tipoMemoria: ramTipo } }
    ];
    if (gpu) pecas.push({ categoria: 'Placa de vídeo', nome: gpu.nome, busca: gpu.busca, motivo: gpu.m, specs: { consumoW: gpu.w } });
    pecas.push({ categoria: 'Armazenamento', nome: `SSD NVMe ${ssd}`, busca: `ssd nvme ${ssd.replace(' ', '')}`, motivo: 'SSD NVMe deixa o sistema, os programas e os jogos muito mais rápidos que um HD.', specs: {} });
    pecas.push({ categoria: 'Fonte', nome: `Fonte ${w} W, 80 Plus Bronze ou superior`, busca: `fonte ${w}w 80 plus`, motivo: 'Dimensionada com folga para o consumo das peças. Prefira marcas conhecidas: a fonte protege todo o resto.', specs: { potenciaW: w } });
    pecas.push({ categoria: 'Gabinete', nome: 'Gabinete mATX/ATX com frente em tela (mesh) e ventoinha incluída', busca: 'gabinete atx mesh', motivo: 'Frente perfurada deixa o ar entrar e mantém o computador fresco.', specs: { formatosSuportados: ['ATX', 'mATX'] } });
    if (!cpu.cooler) pecas.push({ categoria: 'Cooler', nome: 'Cooler a ar com 4 heatpipes (ou water cooler 240 mm)', busca: 'cooler processador heatpipe', motivo: `O ${cpu.nome.replace(/^(AMD|Intel) /, '')} é vendido sem cooler.`, specs: {} });

    const foc = leve ? 'uso do dia a dia, estudo e trabalho' : jogo ? 'jogos' : 'criação e produtividade pesada';
    return { resumo: `Configuração pensada para ${foc}, com ${cpu.nome.replace(/^(AMD|Intel) /, '')}${gpu ? ' e ' + gpu.nome : ' e vídeo integrado'}, ${ramGB} GB de RAM e SSD de ${ssd}.`, pecas, avisos, dica: 'Ative o XMP/EXPO da memória na BIOS e conecte o monitor na saída da placa de vídeo, não da placa-mãe.', _extra: avisos };
  }

  function notebook(p) {
    const o = p.objetivo, orc = Number(p.orcamento);
    let ops;
    if (/Jogos|streaming|3D|intelig|edi[çc][ãa]o/i.test(o)) {
      ops = orc < 5500 ? [['Notebook gamer com GeForce RTX 3050 ou RTX 4050 (linhas Acer Nitro V, Lenovo LOQ, ASUS TUF, Dell G15)', 'notebook gamer rtx 4050'], ['Notebook com GeForce RTX 3050 de 6 GB e tela de 144 Hz', 'notebook rtx 3050']]
        : [['Notebook gamer com GeForce RTX 4060 (Acer Nitro V/Predator, Lenovo LOQ/Legion, ASUS TUF)', 'notebook gamer rtx 4060'], ['Notebook com RTX 4050 e 16 GB de RAM', 'notebook rtx 4050 16gb']];
    } else {
      ops = orc < 3000 ? [['Notebook com Ryzen 5 ou Core i5, 8 GB (ideal 16 GB) e SSD de 256 GB (linhas Acer Aspire, Lenovo IdeaPad, ASUS Vivobook)', 'notebook ryzen 5 ssd'], ['Notebook com tela Full HD e SSD NVMe', 'notebook i5 ssd 512gb']]
        : [['Notebook com Ryzen 5/7 ou Core i5/i7, 16 GB de RAM e SSD de 512 GB (linhas Lenovo IdeaPad/ThinkBook, ASUS Vivobook, Dell Inspiron)', 'notebook 16gb ssd 512gb'], ['MacBook Air com chip Apple M (se você aceita o macOS)', 'macbook air']];
    }
    return { resumo: 'Opções de notebook por categoria, de acordo com o seu uso e orçamento. Em notebook, confira sempre a memória (RAM) e o SSD: nem todos aceitam upgrade.', pecas: ops.map(x => ({ categoria: 'Notebook', nome: x[0], busca: x[1], motivo: 'Combina com o seu uso. Compare modelos específicos nas lojas.', specs: {} })), avisos: ['No modo demonstração indico categorias e linhas de notebooks, não um modelo exato.'], dica: 'Prefira 16 GB de RAM, SSD e tela Full HD, mesmo nos modelos mais baratos.' };
  }

  function upgrade(p) {
    const txt = (p.possui + ' ' + p.detalhes).toLowerCase(), pecas = [];
    if (/\bhd\b|hdd/.test(txt) && !/ssd/.test(txt)) pecas.push({ categoria: 'Armazenamento', nome: 'SSD SATA ou NVMe de 500 GB a 1 TB', busca: 'ssd 1tb', motivo: 'Trocar o HD por SSD é o upgrade que mais acelera um computador.', specs: {} });
    if (/\b(4|8) ?gb/.test(txt)) pecas.push({ categoria: 'Memória RAM', nome: 'Memória RAM para chegar a 16 GB (mesmo tipo e velocidade da atual)', busca: 'memoria ram 16gb', motivo: 'Com 8 GB ou menos, o Windows e os navegadores ficam apertados.', specs: {} });
    if (/jogo|3d|v[ií]deo|edi/.test(p.objetivo.toLowerCase() + txt)) pecas.push({ categoria: 'Placa de vídeo', nome: 'Placa de vídeo dedicada (conforme o seu orçamento e a sua fonte)', busca: 'placa de video', motivo: 'Para jogos e edição, é a peça que mais muda o resultado. Confira a potência da fonte antes.', specs: {} });
    if (!pecas.length) pecas.push({ categoria: 'Armazenamento', nome: 'SSD de 500 GB ou mais', busca: 'ssd 500gb', motivo: 'Ponto de partida seguro para quase qualquer computador mais antigo.', specs: {} });
    return { resumo: 'Sugestões de upgrade na ordem de impacto, com base no que você descreveu.', pecas, avisos: ['O modo demonstração não verifica a compatibilidade com as peças que você já tem. Confirme tipo de memória, encaixe do SSD e potência da fonte antes de comprar.'], dica: 'Rode o aplicativo de diagnóstico do site antes: ele mostra RAM, disco e BIOS do seu computador.' };
  }

  function generate(p) {
    const r = p.tipo === 'notebook' ? notebook(p) : p.tipo === 'upgrade' ? upgrade(p) : desktop(p);
    delete r._extra;
    r.avisos = (r.avisos || []).concat(['Os níveis de orçamento são estimativas: este modo não vê preços. Compare nas lojas e confirme a disponibilidade, pois podem existir modelos mais novos que estes.']);
    r.demo = true;
    return r;
  }
  return { generate };
})();
