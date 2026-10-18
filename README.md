# Oficina 202

Site com três ferramentas para diagnosticar e montar computadores, para quem usa e para técnicos.

| Ferramenta | O que faz |
|---|---|
| **Diagnóstico por chat** | Conversa com perguntas que afunilam a causa de um problema (lentidão, travamentos, calor, tela azul, FPS baixo) e entrega um pré-diagnóstico. |
| **Aplicativo de diagnóstico** | Script para Windows (somente leitura) que verifica BIOS, drivers, RAM, discos, temperaturas e erros do Windows e gera um relatório na própria máquina. O relatório pode ser explicado no chat. |
| **Montar meu PC** | Recomenda peças por objetivo e orçamento, confere a compatibilidade e leva às buscas nas lojas (sem preços). |

## Como abrir

**Jeito simples (modo demonstração):** dê dois cliques em `index.html`. Tudo funciona sem internet e sem servidor, mas o chat segue um roteiro fixo de perguntas e o montador usa regras e um catálogo pequeno. **Não é IA.**

**Com IA real:** dê dois cliques em `iniciar.bat`. Na primeira vez ele pede uma chave da API da Anthropic (arquivo `.env`, modelo em `.env.example`). Requer Node.js. Com a chave, o chat e o montador passam a usar o Claude automaticamente. Sem a chave, o site continua em modo demonstração.

## Arquivos

- `index.html`, `montar.html`, `app.html`: páginas
- `style.css`: visual
- `chat.js`, `montar.js`, `app.js`, `script.js`: comportamento das páginas
- `demo.js`: modo demonstração (roteiro do chat e montador de peças)
- `server.js`, `prompt.txt`, `prompt-recomendador.txt`: servidor e instruções da IA (só no modo com IA)
- `diagnostico.ps1`, `diagnostico.bat`: coletor de diagnóstico para Windows
- `relatorios/`: relatórios gerados pelo coletor (exemplo)

## O coletor de diagnóstico

Dê dois cliques em `diagnostico.bat` (como administrador para ler também temperaturas e SMART do disco). Ele **só lê**, não altera nada, **não envia nada pela internet** e não inclui nome do computador, usuário, números de série, IP ou MAC. O `.ps1` é texto puro e pode ser conferido antes de rodar.

## Limitações conhecidas

- O modo demonstração não usa IA; os níveis de orçamento são estimativas e o catálogo é pequeno (pode haver modelos mais novos).
- Não há preços: os botões abrem a busca da peça em cada loja.
- O coletor é só para Windows e não sabe qual é a BIOS ou o driver mais recente de cada fabricante (informa a idade e orienta conferir no site do fabricante).
- A IA faz triagem, não laudo definitivo: defeito físico só se confirma testando ou trocando a peça.
