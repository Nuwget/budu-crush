# Dudu & Bubu

Um match-3 aconchegante da madrugada, feito para celular (e bonito no desktop). Dudu, o urso roxo, joga; Bubu, a panda, tira uma soneca numa nuvem. O fundo (cidade noturna, lua, névoa, estrelas) é o mesmo universo do `nuwget-page`, agora como o mundo do jogo.

A cozy midnight match-3 for phones. Português e English.

## Jogar

```bash
npm install
npm run dev          # http://localhost:3000
```

- Arraste uma peça para a vizinha para trocar (ou toque numa e depois na vizinha). Teclado: setas movem o cursor, Enter escolhe, uma seta troca.
- 3 iguais somem; 4 em linha cria um limpador de linha/coluna; 5 cria o orbe de cor; L/T cria uma bomba. Combine especiais para efeitos maiores.
- Fases: pontos (joga todas as jogadas), coletar peças, derreter a geada. Fases de coletar e de geada rendem estrelas pelas jogadas que sobram.
- Configurações: música, efeitos, vibração, idioma e movimento reduzido. Tudo fica salvo no navegador.

## Estrutura

```
src/game/            engine pura em TypeScript (sem React/DOM): regras, specials, pontuação, fases, controller de animação
  engine/            match, resolve (jogada → lista de passos), moves, init, rng
  levels/            fases à mão (data/) + gerador + validador
  tiles/art/         pixel art procedural (grids 16x16 → SVG)
src/components/      world (fundo em camadas), characters (Dudu/Bubu), game (tabuleiro, HUD), effects, ui
src/screens/         language, home, map, game, victory, defeat, settings
src/app-shell/       GameRoot: mundo + tela atual + transição de pixels + áudio + botão Voltar
src/state/           store externo + persistência versionada (localStorage "budu:v1")
src/i18n/            en.ts (fonte) e pt.ts (tipado contra en)
src/lib/             áudio sintetizado (Web Audio), haptics
```

A engine resolve uma jogada inteira de uma vez e devolve passos (`swap`, `clear`, `fall`, `refill`…). O `GameController` reproduz esses passos como animação e trava a entrada enquanto toca, então o jogo é determinístico: mesma fase + mesma semente + mesmas jogadas = mesmo resultado.

## Verificação

```bash
npm run test:engine      # 23 testes da engine (runs, L/T, specials, combos, cascatas, fuzz)
npm run check:art        # silhuetas das peças são distintas
npm run sim -- 20        # bot joga as 30 fases: invariantes + taxa de vitória
npm run lint && npm run build
```

Testes no navegador (Playwright, usa o Chromium em `~/.cache/ms-playwright`):

```bash
npm run build && python3 -m http.server 4191 --directory out &
node scripts/shoot.mjs shots 393x852 768x1024     # screenshots de todas as telas
node scripts/play-bot.mjs shots                   # joga a fase 1 com drags reais
node scripts/a11y-check.mjs                       # teclado, movimento reduzido, persistência, tabuleiro cabe na tela
```

## Publicar

`output: "export"` gera um site estático em `out/`. O workflow `.github/workflows/deploy.yml` publica no GitHub Pages; para um subcaminho use `NEXT_PUBLIC_BASE_PATH=/<repo>` no build. Imagens e CSS passam por `asset()` (`src/lib/asset.ts`) para respeitar esse prefixo.

## Créditos

Dudu e Bubu: ilustração original usada como base dos sprites. Peças, fundo e interface: pixel art procedural em código.
