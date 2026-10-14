@AGENTS.md

## Dudu & Bubu (match-3)

- `src/game/**` é TypeScript puro: não importe React, DOM, `Math.random` nem `Date`; use imports relativos com extensão `.ts` (a engine roda direto no Node: `node scripts/engine-check.ts`).
- Mude regras na engine e cubra em `scripts/engine-check.ts`; rode `npm run test:engine`, `npm run sim` e `npm run check:art` antes de `npm run build`.
- Textos de interface ficam em `src/i18n/en.ts` e `pt.ts` (pt é tipado contra en). Não escreva texto visível direto nos componentes, exceto a tela de idioma (bilíngue de propósito).
- Animação só em `transform`/`opacity`; o tabuleiro move peças por `--r`/`--c`. Respeite `useReducedMotion` e o atributo `data-motion` do `<html>`.
- Assets estáticos passam por `asset()` por causa do basePath do GitHub Pages.

## Camadas, áudio e QA de performance

- Camadas da tela de jogo (um contexto de empilhamento, `.screen-game`; tokens `--z-*` em `globals.css`): HUD → barra de objetivo → tabuleiro → elenco → partículas. Dudu/Bubu em repouso ficam atrás da barra; durante uma reação o `.hud-stats` sobe para `--z-cast` (via `.pal[data-react]`). O Duo mora dentro de `.board-slot`, entre as peças (z 4) e os números/palavras (6/12): nunca atrás do tabuleiro, nunca na frente de uma palavra. Não crie `z-index` solto fora desse modelo.
- Áudio (`src/lib/audio/`): tudo é síntese, sem arquivos. `engine.ts` tem reverb sintético, ruído compartilhado, limite de vozes e `duckMusic`; `sfx.ts` guarda as receitas (sino → `bell`, escada pentatônica por onda da cascata). Cada subida de nível acrescenta notas/harmônicos, não volume. Não aloque buffers nem nós fora de `engine.ts`.
- Animações pontuais usam `src/lib/anim.ts` (`run`/`add`/`stop`/`busy`); não chame `getAnimations()`, `offsetWidth` nem `getBoundingClientRect` por onda de cascata (força layout). Nada de `filter` animado.
- QA de cascata longa: `node scripts/cascade-search.ts <out.json>`, build com `NEXT_PUBLIC_QA=1`, depois `node scripts/qa-cascade.mjs <dir> [W] [H] [cpu]`.
