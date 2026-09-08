# Etapa 03 — Interface Responsiva com CSS

Sistema de Fila (QueueSmart). Esta etapa aplica CSS organizado sobre a
estrutura HTML da Etapa 02, com Flexbox, CSS Grid, media queries e
adaptação para desktop, tablet e smartphone.

## Interfaces apresentadas


| # | Interface | Arquivo | Contexto |
|---|-----------|---------|----------|
| 01 | Painel do Atendente | `painel-atendente.html` | Uso interno, atendente logado |
| 02 | Relatórios | `relatorios.html` | Uso interno, atendente logado |
| 03 | Quiosque do Cliente | `quiosque-cliente.html` | Autoatendimento, emissão de senha |
| 04 | TV de Monitoramento | `tv-monitoramento.html` | Exibição pública, leitura à distância |

## Viewport utilizado em cada evidência

Todas as evidências devem ser capturadas nos três viewports padronizados,
para as três interfaces acima, totalizando 12 arquivos:

| Viewport | Resolução | Arquivos |
|----------|-----------|----------|
| Desktop | 1440 × 900 px | `desktop-tela-01.png`, `desktop-tela-02.png`, `desktop-tela-03.png`, `desktop-tela-04.png` |
| Tablet | 768 × 1024 px | `tablet-tela-01.png`, `tablet-tela-02.png`, `tablet-tela-03.png`, `tablet-tela-02.png` |
| Smartphone | 390 × 844 px | `smartphone-tela-01.png`, `smartphone-tela-02.png`, `smartphone-tela-03.png`, `smartphone-tela-04.png` |

- `tela-01` = Painel do Atendente
- `tela-02` = Relatórios
- `tela-03` = Quiosque do Cliente
- `tela-04` = TV de Monitoramento

## Breakpoints utilizados

Todo o CSS segue a abordagem *mobile-first*, com dois breakpoints
principais (mínimo exigido: dois), escolhidos para coincidir com os
próprios viewports de teste:

| Breakpoint | Regra | Efeito |
|------------|-------|--------|
| Base (< 600px) | sem media query | 1 coluna, botões empilhados, navegação compacta — cobre o smartphone (390px) |
| Tablet | `@media (min-width: 600px)` | grades passam a 2–3 colunas, cabeçalhos ficam em linha — cobre o tablet (768px) |
| Desktop | `@media (min-width: 1024px)` | layout final em grid completo (ex.: tabela + resumo lado a lado, TV em 3 colunas) — cobre o desktop (1440px) |

## Principais decisões de responsividade

- **Flexbox** para tudo que é uma "fileira" de elementos de tamanho
  variável: cabeçalhos (`site-header`, `tv-header`), barras de ação
  (`action-bar`, `toolbar-actions`), badges e formulários. Os itens
  quebram linha (`flex-wrap: wrap`) em vez de espremer.
- **CSS Grid** para layouts bidimensionais: a grade de indicadores do
  relatório (`stat-grid`, 1 → 3 → 6 colunas), o painel do atendente
  (tabela + resumo lado a lado a partir de 1024px) e o rodapé da TV
  (`tv-grid`, com `grid-template-areas` mudando de empilhado → 2 colunas
  → 3 colunas).
- **Tabelas** não tentam se redesenhar em telas pequenas (colunas
  espremidas ficam ilegíveis); em vez disso, ficam dentro de um
  `.table-wrap` com rolagem horizontal, mantendo a leitura das células.
- **Botões de ação primária** (Chamar Próximo, Emitir Senha) viram
  largura total no smartphone para facilitar o toque; no desktop ficam
  lado a lado.
- **Duas identidades visuais dentro do mesmo sistema**: as telas
  administrativas (relatórios e painel do atendente) compartilham
  `admin.css` — visual denso, tabular, cor de marca só no cabeçalho.
  As telas públicas (quiosque e TV) compartilham `public.css` — tipografia
  maior, mais espaço em branco, cartão central único, pensado para leitura
  rápida ou à distância.
- **Espaçamento consistente**: toda a folha usa uma escala fixa de
  espaçamento (`--space-1` a `--space-8`, de 4px a 64px) definida em
  variáveis CSS, evitando valores soltos espalhados pelas regras.
- Foco visível (`:focus-visible`) e `prefers-reduced-motion` respeitados
  como piso mínimo de acessibilidade.

## Localização dos arquivos CSS

```
/css/base.css     → tokens, reset, tipografia e componentes
                     compartilhados por todas as telas (botões, cards,
                     badges, formulários, tabela com rolagem)
/css/admin.css    → layout e breakpoints de relatorios.html e
                     painel-atendente.html
/css/public.css   → layout e breakpoints de quiosque-cliente.html e
                     tv-monitoramento.html
```

Cada página carrega `base.css` e, em seguida, o arquivo específico do
seu contexto (`admin.css` ou `public.css`).
