@AGENTS.md

## Dudu & Bubu (match-3)

- `src/game/**` é TypeScript puro: não importe React, DOM, `Math.random` nem `Date`; use imports relativos com extensão `.ts` (a engine roda direto no Node: `node scripts/engine-check.ts`).
- Mude regras na engine e cubra em `scripts/engine-check.ts`; rode `npm run test:engine`, `npm run sim` e `npm run check:art` antes de `npm run build`.
- Textos de interface ficam em `src/i18n/en.ts` e `pt.ts` (pt é tipado contra en). Não escreva texto visível direto nos componentes, exceto a tela de idioma (bilíngue de propósito).
- Animação só em `transform`/`opacity`; o tabuleiro move peças por `--r`/`--c`. Respeite `useReducedMotion` e o atributo `data-motion` do `<html>`.
- Assets estáticos passam por `asset()` por causa do basePath do GitHub Pages.
