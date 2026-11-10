# Etapa 05 — Modularização e Comunicação Assíncrona

Sistema de Fila (QueueSmart). Esta etapa organiza o JavaScript em módulos por
responsabilidade, adiciona comunicação assíncrona (Promises, `async/await` e
Fetch API) com um **serviço simulado**, trata estados de **carregamento, sucesso
e erro**, e passa a **salvar o histórico diário** que alimenta a página de
**Relatórios** (agora dinâmica).

- **Tag Git da entrega:** `etapa-05`
- **Persistência:** `localStorage` (por trás do serviço simulado).

---

## 1. Como executar

Igual à Etapa 04 (ES Modules exigem HTTP, não funciona com `file://`):

```bash
cd src
python3 -m http.server 8000
```

| Aba | URL |
|-----|-----|
| Quiosque | `http://localhost:8000/quiosque-cliente.html` |
| Painel do atendente | `http://localhost:8000/painel-atendente.html` |
| TV | `http://localhost:8000/tv-monitoramento.html` |
| Relatórios | `http://localhost:8000/relatorios.html` |

---

## 2. Organização em módulos

```
src/js/
├── api/
│   ├── mockServer.js        serviço simulado: rotas REST, latência, falha simulada
│   └── apiClient.js         ApiClient (default export) + ApiError; troca de transporte
├── services/
│   ├── filaService.js       emitirSenha(), chamarProximo()
│   └── relatorioService.js  consultarRelatorio(), importarDadosExemplo(), removerDadosExemplo()
├── ui/
│   ├── graficoLinhas.js     gráfico de linhas em SVG (tooltip, teclado, responsivo)
│   ├── feedback.js          carregando / sucesso / erro, bloqueio de botões
│   └── dom.js               helper el() para montar elementos
├── historicoDiario.js       registro e consolidação do histórico por dia   (NOVO)
├── relatorios.js            tela de relatórios                             (NOVO)
├── quiosque-cliente.js      agora assíncrono
├── painel-atendente.js      "Chamar Próximo" agora assíncrono
├── tv-monitoramento.js      (sem mudanças)
├── backend.js / localStorageBackend.js   fila (com ganchos no histórico)
└── utils.js                 + datas, horas e formatação de duração
src/data/historico-exemplo.json   dados de exemplo lidos com fetch()
```

```
Telas ──► services/* ──► api/apiClient.js ──► api/mockServer.js ──► backend.js ──► localStorage
                                                      └──────────► historicoDiario.js
```

As telas **não** conhecem `localStorage` nem o servidor simulado: só chamam
funções de `services/`. Para usar um servidor real, basta passar ao `ApiClient`
um transporte baseado em `fetch()`.

### Rotas do serviço simulado (REST)

| Método | Rota | Função |
|--------|------|--------|
| `POST` | `/senhas` | Emite senha `{ nome, tipo: "A" \| "P" }` → `201` |
| `POST` | `/atendimentos` | Chama a próxima senha → `201` (ou `200 { senha: null }` se a fila estiver vazia) |
| `GET` | `/relatorios?de=&ate=` | Relatório consolidado do período |
| `POST` | `/relatorios/importacao` | Importa dias de exemplo |
| `DELETE` | `/relatorios/exemplos` | Remove somente os dias de exemplo |

Erros: `400` (dados inválidos), `422` (tipo inválido), `404` (rota inexistente),
`500` (erro interno) e **falha de rede** (a Promise é rejeitada, como no `fetch`).

---

## 3. Dados salvos para o relatório (histórico diário)

Um registro por dia em `localStorage`, chave `daily-AAAA-MM-DD`:

```json
{
  "date": "2026-11-09",
  "exemplo": false,
  "emitidas":      { "A": 12, "P": 4 },
  "atendidas":     { "A": 10, "P": 4 },
  "esperaTotalMs": { "A": 5400000, "P": 900000 },
  "porHora":       { "09": { "A": 3, "P": 1 } }
}
```

| Informação | Quando é gravada |
|------------|------------------|
| Senhas **normais e preferenciais emitidas** no dia | Ao emitir senha (`localStorageInsertPassword` → `registerIssued`) |
| Senhas **normais e preferenciais atendidas** no dia | Ao chamar (`localStoragePopNext` → `registerCalled`) |
| **Tempo de espera** (soma, em ms) por tipo | Ao chamar: `agora − hora de emissão` |
| Atendimentos por **hora cheia** | Ao chamar |

O **tempo médio de espera** não é salvo pronto: guardamos a **soma** e a
**quantidade** e dividimos na leitura (`soma ÷ atendidas`). Assim a média
continua correta ao juntar vários dias — média de médias estaria errada. Isso dá
a média **normal**, **preferencial** e **geral**, por dia e no período.
O dia usa o fuso `America/Sao_Paulo`.

---

## 4. Relatórios dinâmicos (`relatorios.js`)

- Filtro por **data inicial/final** (padrão: últimos 30 dias); "Limpar" restaura o padrão.
- **Resumo:** total de atendimentos, normais, preferenciais, espera média geral / normal / preferencial.
- **Distribuição por prioridade** (com %) e senhas emitidas por tipo.
- **Gráfico "Senhas por Dia"** (`ui/graficoLinhas.js`, SVG puro, sem bibliotecas): uma linha por série —
  **Normais**, **Preferenciais** e **Total** — com um ponto por dia. O seletor *Emitidas / Atendidas* troca o que é contado.
  Passando o mouse (ou com as setas do teclado, `Home`/`End`/`Esc`) aparece uma linha-guia e um tooltip com os três
  valores do dia; o gráfico se redesenha ao mudar a largura da tela. As cores foram validadas para daltonismo
  (laranja = preferencial, como nos badges; verde-água = normal; azul = total) e a legenda, o tooltip e a tabela abaixo
  garantem que nada dependa só da cor.
- **Tabela por dia:** emitidas e atendidas (N/P) e espera média (N/P/geral), com linha de total.
- **Atendimentos por horário** (hora a hora).
- **Exportar PDF** usa `window.print()` (o CSS de impressão esconde menus e filtros).
- **Dados de exemplo:** o botão busca `data/historico-exemplo.json` com **`fetch()`**
  e envia ao serviço (`POST`). Os dias ficam marcados com a etiqueta *exemplo*, nunca
  sobrescrevem dias reais e podem ser removidos (`DELETE`).

---

## 5. Estados de carregamento, sucesso e erro

Componente `.feedback` (`base.css`) com `aria-live`, controlado por `ui/feedback.js`.

| Tela | Operação | Carregando | Sucesso | Erro |
|------|----------|-----------|---------|------|
| Quiosque | `POST /senhas` | "Emitindo sua senha…" + botões desabilitados | "Senha normal A-001 emitida para Ana…" | Mensagem do servidor; **o nome digitado é preservado** |
| Painel | `POST /atendimentos` | "Chamando próxima senha…" + botão desabilitado | "Chamando P-001 — caio." / "Nenhuma senha disponível" | Mensagem de erro |
| Relatórios | `GET /relatorios` | "Carregando relatório…" + `aria-busy` | "Relatório atualizado às HH:MM:SS" ou aviso de período sem dados | Mensagem + botão **Tentar novamente** |
| Relatórios | Importar / remover | Mensagem de progresso | Quantidade de dias importados/removidos | Mensagem de erro |

**Como testar o erro:** na tela de Relatórios, marque *"Simular falha de
comunicação (teste)"*. A flag vale para todas as telas (também para quiosque e painel).
Outros erros: período com data inicial > final, nome inválido (`400`).

**Proteção contra respostas fora de ordem:** `relatorios.js` ignora a resposta de
uma consulta se outra mais recente já foi disparada.

---

## 6. Matriz de evidências (requisitos da Etapa 05)

| Requisito | Onde |
|-----------|------|
| Separar o código em módulos / evitar arquivo único | Seção 2 — `api/`, `services/`, `ui/`, páginas e `historicoDiario.js` |
| Chamadas assíncronas | Todos os métodos de `ApiClient` e `services/*` retornam Promises |
| Fetch API | `relatorioService.importarDadosExemplo()` → `fetch("data/historico-exemplo.json")` |
| Promises e `async/await` | `mockServer.request` (Promise com `setTimeout`), `ApiClient.#send`, handlers das telas com `try/catch/finally` |
| Estados de carregamento | Seção 5 |
| Erros de comunicação | `ApiClient` converte falha de rede em `ApiError(0, …)`; telas exibem a mensagem |
| Serviço simulado | `api/mockServer.js` |
| **Consulta** | `GET /relatorios` |
| **Operação submetida** | `POST /senhas`, `POST /atendimentos`, `POST /relatorios/importacao` |
| Sucesso / erro / carregamento | Seção 5 |

---

## 7. Roteiro de teste

1. **Histórico:** no quiosque emita `ana` (normal) e `caio` (preferencial); no painel chame as duas.
   Em Relatórios (*Gerar Relatório*) o dia de hoje mostra 1 normal + 1 preferencial emitidas/atendidas
   e as esperas médias. No DevTools → Local Storage confira a chave `daily-AAAA-MM-DD`.
2. **Carregamento:** ao emitir/chamar/gerar, aparece o spinner e os botões ficam desabilitados.
3. **Erro:** marque *Simular falha*, clique em *Gerar Relatório* → mensagem de erro e botão
   *Tentar novamente*. Desmarque e tente de novo → sucesso. No quiosque com a falha ativa, o nome fica no campo.
4. **Fetch:** *Importar dados de exemplo* → 20 dias com etiqueta *exemplo*; *Remover dados de exemplo* → somem.
5. **Gráfico:** com dados de exemplo importados, passe o mouse sobre o gráfico (tooltip com normais, preferenciais e total
   do dia); alterne *Emitidas/Atendidas*; use `Tab` e as setas no gráfico; reduza a janela e veja o redesenho.
6. **Validação do período:** data inicial maior que a final → erro sem chamar o serviço.

---

## 8. Evidências (capturas de tela)

Salvas em `docs/etapa-05/` e geradas por `tests/capturar-evidencias-etapa-05.js`
(que também confere os valores gravados no histórico diário).

| Arquivo | O que mostra |
|---------|--------------|
| `01-quiosque-carregando.png` | Quiosque com "Emitindo sua senha…" e botões desabilitados |
| `02-quiosque-sucesso.png` | Senha emitida com sucesso |
| `03-quiosque-erro.png` | Falha de comunicação simulada; nome preservado no campo |
| `04-painel-carregando.png` | Painel com "Chamando próxima senha…" |
| `05-painel-chamando.png` | Painel após a chamada (sucesso) |
| `06-relatorio-carregando.png` | Relatório carregando |
| `07-relatorio-dados-do-dia.png` | Relatório com o histórico real do dia |
| `08-relatorio-erro.png` | Erro de comunicação com botão *Tentar novamente* |
| `09-relatorio-dados-exemplo.png` | Relatório com dados de exemplo importados via `fetch()` |
| `10-grafico-emitidas.png` | Gráfico de senhas emitidas por dia (normais, preferenciais, total) com tooltip |
| `11-grafico-atendidas.png` | Mesmo gráfico com a contagem de atendidas |

---

## 9. Correção incluída

- As senhas começavam em `A-000`/`P-000` (o contador era lido antes de incrementar). Agora
  começam em `A-001`/`P-001`, como a documentação da Etapa 04 já descrevia.
- Uma regra mobile do `admin.css` (tabela da fila virando cards) afetava todo `.table-wrap`; agora vale só para a fila
  (`.queue-layout`), para a tabela diária do relatório rolar normalmente no celular.
- `base.css` tinha um `*/` solto em `--color-bg` que invalidava a declaração seguinte (`--color-surface`).

## 10. Limitações conhecidas

- O serviço é simulado: os dados continuam no `localStorage` do navegador. A TV e a
  tabela do painel ainda leem a fila de forma síncrona; só as **operações de escrita e o
  relatório** passam pela camada assíncrona.
- O histórico é por navegador/origem. O relatório mostra o dia por data de emissão
  (emitidas) e de chamada (atendidas, espera e horário).
- "Ignorar próxima senha" continua pendente.
