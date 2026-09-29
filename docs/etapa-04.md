# Etapa 04 — Interatividade com JavaScript

Sistema de Fila (QueueSmart). Esta etapa adiciona comportamento dinâmico às
telas criadas nas Etapas 02 e 03 usando **JavaScript (ES Modules)**. Nenhum
arquivo HTML ou CSS foi alterado, exceto pela inclusão da tag
`<script type="module" src="js/...">` em cada página que passou a ter
comportamento.

- **Tag Git da entrega:** `etapa-04`
- **Persistência:** `localStorage` do navegador (não há servidor; o módulo
  `backend.js` isola essa camada para que possa ser trocada futuramente).

---

## 1. Como executar e testar

Os scripts usam `import`/`export` (`type="module"`), que **não funcionam ao
abrir o HTML direto pelo disco (`file://`)**. É necessário servir a pasta por
HTTP local:

```bash
cd src
python3 -m http.server 8000
# ou: extensão "Live Server" do VS Code
```

Abra em **abas diferentes do mesmo navegador** (mesma origem, pois o
`localStorage` é compartilhado):

| Aba | URL |
|-----|-----|
| Quiosque do cliente | `http://localhost:8000/quiosque-cliente.html` |
| Painel do atendente | `http://localhost:8000/painel-atendente.html` |
| TV de monitoramento | `http://localhost:8000/tv-monitoramento.html` |

Para reiniciar o estado de testes: DevTools → Application → Local Storage →
*Clear All* (ou `localStorage.clear()` no console) e recarregar as abas.

---

## 2. Arquivos JavaScript adicionados

Localização: `src/js/`

| Arquivo | Responsabilidade |
|---------|------------------|
| `quiosque-cliente.js` | Validação do formulário e emissão de senha |
| `painel-atendente.js` | Renderização da fila, resumo e botão "Chamar Próximo" |
| `tv-monitoramento.js` | Relógio, senha chamada, próximos, tempo médio e avisos |
| `backend.js` | API única usada pelas telas (inserir, ordenar, chamar, notificar mudanças) |
| `localStorageBackend.js` | Implementação da persistência em `localStorage` |
| `utils.js` | Funções auxiliares (`pad`, `getTime`, `getDate`) |

`relatorios.html` continua estático nesta etapa (sem script).

### Arquitetura em camadas

```
quiosque-cliente.js ─┐
painel-atendente.js ─┼──► backend.js ──► localStorageBackend.js ──► localStorage
tv-monitoramento.js ─┘         │
                               └──► utils.js
```

As telas nunca acessam o `localStorage` diretamente; falam apenas com
`backend.js`.

### Modelo de dados no `localStorage`

| Chave | Conteúdo |
|-------|----------|
| `passwords-A` / `passwords-P` | Senhas normais / preferenciais aguardando, concatenadas em blocos de 5 caracteres (ex.: `A-001A-002`) |
| `A-001-name`, `-attended`, `-time` | Nome do cliente, status e horário de emissão (ms) de cada senha |
| `pass-count`, `pass-count-A`, `pass-count-P` | Contadores de senhas emitidas |
| `pass-rem`, `pass-rem-A`, `pass-rem-P` | Contadores de senhas já chamadas |
| `time-sum` | Soma dos tempos de espera das senhas chamadas (ms) |
| `cur-index` | Quantas preferenciais seguidas já foram chamadas (0 a 2) — controla a regra 2:1 |
| `calling-password` | Senha sendo chamada agora (`-` se nenhuma) |
| `last-passwords` | Últimas 5 senhas chamadas (usadas nos avisos da TV) |

---

## 3. Funcionalidades interativas

### 3.1 Emissão de senha com validação de formulário

**Tela:** Quiosque do cliente.
**Arquivos:** `quiosque-cliente.js`, `backend.js`, `localStorageBackend.js`, `utils.js`.

**Como funciona**

1. O script registra um evento `click` nos botões *Emitir Senha Normal* e
   *Emitir Senha Preferencial*.
2. A função `savePassword(event, type)` lê o campo `#nome-cliente` e valida o
   valor com a expressão regular `/^[a-z]{3,30}$/`.
3. **Nome inválido:** a função define `setCustomValidity(...)` e retorna sem
   chamar `preventDefault()`; o navegador então bloqueia o envio do formulário
   e exibe a mensagem de erro no campo.
4. **Nome válido:** `event.preventDefault()` evita o recarregamento da página,
   `insertPassword(nome, "A" | "P")` grava a nova senha (formato `A-001`,
   `P-001`, ... gerado com `pad`) e o campo é limpo.
5. `backend.js` dispara um evento customizado para que as demais telas
   atualizem.

**Conceitos usados:** manipulação do DOM (`querySelector`, `value`), eventos
(`click`), validação com expressão regular e Constraint Validation API,
funções, arrays (`pref = ['A','P']` mapeia o tipo pela posição).

### 3.2 Chamada do próximo com regra de prioridade (2 preferenciais : 1 normal)

**Tela:** Painel do atendente.
**Arquivos:** `painel-atendente.js`, `backend.js`, `localStorageBackend.js`.

**Como funciona**

1. O clique em *Chamar Próximo* executa `backend.popNext()`.
2. `getNext()` decide o próximo: se já foram chamadas 2 preferenciais seguidas
   (`cur-index === 2`) ou não há preferenciais, pega a primeira normal; caso
   contrário, a primeira preferencial.
3. `localStoragePopNext()` remove a senha da fila correspondente, atualiza
   `calling-password`, o histórico `last-passwords`, os contadores, o
   `cur-index` (sobe até 2 ao chamar preferencial; volta a 0 ao chamar normal)
   e acumula o tempo de espera em `time-sum`.
4. Um evento customizado (`dispatchChange`) faz o painel e a TV se
   redesenharem.

**Conceitos usados:** eventos, funções, arrays (filas de senhas, `substring`
em blocos de 5 caracteres), lógica condicional, estado persistente.

### 3.3 Fila de espera e resumo dinâmicos no painel

**Tela:** Painel do atendente.
**Arquivos:** `painel-atendente.js`, `backend.js`.

**Como funciona**

- `renderQueue()` limpa o `<tbody>` e recria uma linha por senha usando
  `document.createElement`, `appendChild` e `textContent`. A ordem exibida vem
  de `getSortedPasswords()`, que intercala normais e preferenciais respeitando
  a regra 2:1 e o estado atual de `cur-index`.
- Cada linha mostra senha, cliente, tipo (badge `badge--preferencial` ou
  `badge--normal`) e tempo de espera formatado (`formatWaitTime`).
- Os indicadores **Total aguardando**, **Preferenciais** e **Tempo médio de
  espera** são recalculados a cada renderização com `filter` e `reduce`.
- `renderNext()` atualiza o campo "Próximo" do banner de regra.
- A tela se atualiza ao emitir/chamar (`backend.onQueueChange`) e os tempos de
  espera são recalculados a cada 30 s com `setInterval`.

**Conceitos usados:** manipulação do DOM, alteração dinâmica da interface,
`map`, `filter`, `reduce`, `for...of`, temporizadores.

### 3.4 Monitoramento em tempo real na TV

**Tela:** TV de monitoramento.
**Arquivos:** `tv-monitoramento.js`, `backend.js`, `localStorageBackend.js`, `utils.js`.

**Como funciona**

- `updateMonitor()` chama, em sequência, `updateQueue()` (chips da fila e
  total), `updateCalling()` (senha e nome chamados), `updateNext()` (próxima
  senha com badge quando preferencial), `updateTime()` (tempo médio) e
  `updateNotices()` (últimas senhas chamadas).
- É reexecutada sempre que a fila muda, seja na mesma aba (evento customizado)
  ou em **outra aba** (evento nativo `storage`), sem recarregar a página.
- O relógio e a data são atualizados a cada segundo por `setInterval(updateDate, 1000)`.
- O nome do cliente é exibido com a primeira letra maiúscula
  (`capitalizeFirstLetter`).

**Conceitos usados:** manipulação do DOM (`innerHTML`, `innerText`), eventos
(`storage` e `CustomEvent`), `reduce` para gerar o HTML da fila, funções,
temporizadores.

---

## 4. Validações implementadas

| Campo | Regra | Onde |
|-------|-------|------|
| Nome do cliente | Obrigatório (`required`) | `quiosque-cliente.html` |
| Nome do cliente | Apenas letras minúsculas de `a` a `z`, de 3 a 30 caracteres (regex `/^[a-z]{3,30}$/`) | `quiosque-cliente.js` |
| Nome do cliente | Tamanho máximo de 20 caracteres (`maxlength`) e padrão `[a-zA-Z]+` como primeira barreira do HTML | `quiosque-cliente.html` |
| Mensagem de erro | `setCustomValidity` com texto explicativo; limpo em `oninput` quando o usuário volta a digitar | `quiosque-cliente.js` / `.html` |

## 5. Situações inválidas tratadas

| Situação | Tratamento |
|----------|------------|
| Campo de nome vazio | Envio bloqueado, mensagem de validação exibida |
| Nome com números, símbolos, espaços, acentos ou letras maiúsculas | Envio bloqueado, senha **não** é criada |
| Nome com menos de 3 caracteres | Envio bloqueado |
| "Chamar Próximo" com a fila vazia | `getNext()` retorna `"-"`; nenhuma senha é removida e nenhum contador é alterado; a interface mostra `—` no painel e `-` na TV |
| Ainda não existe nenhuma senha (chaves ausentes no `localStorage`) | Funções de leitura usam valores padrão (`?? ""`, `?? "-"`, `0`), evitando erros de `null` |
| Fila sem preferenciais ou sem normais | A regra 2:1 cai automaticamente para o tipo disponível |
| Elementos ausentes na página | O painel verifica `if (!tbody) return` / `if (element)` antes de alterar o DOM |

---

## 6. Matriz de evidências

| Requisito | Funcionalidade relacionada | Arquivo(s) | Evidência |
|-----------|---------------------------|------------|-----------|
| Manipulação do DOM | 3.1, 3.3, 3.4 | `quiosque-cliente.js`, `painel-atendente.js`, `tv-monitoramento.js` | `querySelector` no topo de cada arquivo; `renderQueue()` cria linhas com `createElement`/`appendChild`; `updateQueue()` e `updateNotices()` alteram `innerHTML` |
| Tratamento de eventos | 3.1, 3.2, 3.4 | `quiosque-cliente.js`, `painel-atendente.js`, `tv-monitoramento.js`, `backend.js` | `addEventListener("click", ...)` nos botões do quiosque e no botão *Chamar Próximo*; `onQueueChange` registra `storage` e o `CustomEvent` de mudança |
| Validação de formulários | 3.1 | `quiosque-cliente.js`, `quiosque-cliente.html` | `savePassword()`: regex `/^[a-z]{3,30}$/` + `setCustomValidity`; atributos `required`, `pattern`, `maxlength`. Ver capturas `04-validacao-*.png` |
| Alteração dinâmica da interface | 3.2, 3.3, 3.4 | `painel-atendente.js`, `tv-monitoramento.js` | Tabela, contadores, próximo, senha chamada, chips da fila e avisos mudam sem recarregar a página ao emitir ou chamar senhas |
| Uso de funções | Todas | Todos os `.js` | `savePassword`, `renderQueue`, `renderNext`, `updatePanel`, `updateMonitor`, `insertPassword`, `popNext`, `getNext`, `getSortedPasswords`, `pad`, etc. |
| Uso de arrays | 3.1, 3.2, 3.3 | `quiosque-cliente.js`, `backend.js`, `localStorageBackend.js` | `pref = ['A','P']`; `getSortedPasswords()` monta o array da fila com *spread*; `localStorageGetNormalPasswords()` retorna array de senhas |
| Métodos de iteração | 3.3, 3.4 | `painel-atendente.js`, `tv-monitoramento.js`, `backend.js` | `map` (`getSortedPasswords().map(passToData)`), `filter` (contagem de preferenciais), `reduce` (tempo total; HTML dos chips), `for...of`, `for`, `while` |
| Tratamento de situações inválidas | 3.1, 3.2 | `quiosque-cliente.js`, `localStorageBackend.js`, `painel-atendente.js` | Nome inválido bloqueado; fila vazia retorna `"-"` em `getNext()`/`popNext()`; valores padrão `?? ` para dados inexistentes; verificações `if (!elemento)` |

> Funcionalidade que **não** é obtida apenas com HTML/CSS: emissão de senha,
> ordenação com prioridade 2:1, chamada da próxima senha e atualização em tempo
> real entre telas (3.1 a 3.4).

---

## 7. Roteiro de teste

### Teste 1 — Validação de nome (quiosque)

1. Deixe o campo vazio e clique em *Emitir Senha Normal* → mensagem de campo obrigatório/nome inválido.
2. Digite `Ana` (maiúscula) → nome rejeitado.
3. Digite `jo` (menos de 3 letras) → rejeitado.
4. Digite `joao1`, `maria silva` ou `joão` → rejeitado.
5. Digite `ana` → senha `A-001` criada, campo limpo, página não recarrega.

### Teste 2 — Regra de prioridade 2:1

1. No quiosque, emita nesta ordem: `ana` (normal), `bia` (normal), `caio` (preferencial), `davi` (preferencial), `edu` (preferencial).
2. No painel, a fila deve aparecer como: `P-001`, `P-002`, `A-001`, `P-003`, `A-002`.
3. Clique em *Chamar Próximo* cinco vezes e confirme que a ordem de chamada segue essa sequência.

### Teste 3 — Atualização dinâmica entre telas

1. Com painel e TV abertos em abas separadas, emita uma senha no quiosque → a fila do painel e os chips da TV mudam sozinhos.
2. Clique em *Chamar Próximo* → a TV mostra a senha e o nome chamados, atualiza "Próximo", o tempo médio e os avisos (últimas 5 senhas chamadas).
3. Observe o relógio da TV avançando a cada segundo.

### Teste 4 — Fila vazia

1. Chame todas as senhas até a fila esvaziar.
2. Clique em *Chamar Próximo* novamente → nada quebra; painel exibe `—` e a TV exibe `-`.

---

## 8. Evidências (capturas de tela)

Salvo em `docs/img/etapa-04/`:

| Arquivo | O que deve mostrar |
|---------|--------------------|
| `01-quiosque-normal.png` | Quiosque com nome válido preenchido |
| `02-validacao-vazio.png` | Mensagem de erro com campo vazio |
| `03-validacao-invalido.png` | Mensagem de erro com nome inválido (maiúscula, número ou < 3 letras) |
| `04-painel-fila.png` | Painel com a fila ordenada (preferenciais intercaladas) e resumo preenchido |
| `05-painel-apos-chamar.png` | Painel após *Chamar Próximo* (fila e "Próximo" atualizados) |
| `06-tv-chamando.png` | TV com senha chamada, próximos da fila e avisos |
| `07-fila-vazia.png` | TV com a fila vazia |

---

## 9. Limitações conhecidas

- O **botão "Ignorar próxima senha"** e a página de **Relatórios** ainda não
  possuem comportamento dinâmico (previstos para etapas futuras).
- Os dados ficam no `localStorage` do navegador: só são compartilhados entre
  abas do mesmo navegador e origem. Para uso real, será necessário um backend.
- As senhas são armazenadas em blocos de 5 caracteres (`A-001`); a contagem
  acima de 999 senhas por tipo exigirá ajuste do formato.
- Quando duas preferenciais seguidas já foram chamadas e só restam
  preferenciais na fila, `getNext()` retorna `"-"` (não há normal para
  intercalar) até que uma senha normal seja emitida.
