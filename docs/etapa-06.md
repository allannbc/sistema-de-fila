# Etapa 06 — API REST da Aplicação

API do Sistema de Fila em **Python + Django** (somente Django, sem bibliotecas extras),
com respostas em JSON. **Não há banco de dados nesta etapa:** os dados ficam em memória e são
perdidos quando o servidor é reiniciado (a persistência fica para a próxima etapa). O código fica em `api/`.

- **Recurso principal:** `senhas` (CRUD completo).
- **Outros recursos:** `fila`, `atendimentos` e `relatorios` (histórico diário que alimenta a tela de relatórios).
- **Coleção Postman:** [`docs/etapa-06/fila-api.postman_collection.json`](etapa-06/fila-api.postman_collection.json)

---

## 1. Como executar

```bash
cd api
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py runserver 8001
```

A API fica em `http://127.0.0.1:8001/api/`. Para zerar os dados, basta reiniciar o servidor.

**Testar:** importe a coleção no Postman (ou Insomnia) e execute a pasta inteira
(*Run collection*); ela já traz os testes de status. Também funciona com `curl` (seção 5).

---

## 2. Organização do código

```
api/
├── manage.py
├── requirements.txt
├── config/
│   ├── settings.py     configuração mínima (sem banco, sessão ou CSRF: API stateless)
│   └── urls.py         monta /api/ e devolve 404 em JSON para rotas desconhecidas
└── fila/
    ├── urls.py         ROTAS, agrupadas por recurso
    ├── views.py        um handler por método HTTP
    ├── validators.py   validação das entradas
    ├── services.py     regras da fila e do histórico diário
    ├── repositorio.py  armazenamento em memória (Senha, HistoricoDiario)
    └── http.py         formato único de erro, leitura de JSON, 405
```

---

## 3. Coleções (dados)

**Senha** — recurso principal (`/api/senhas/`)

| Campo | Tipo | Observação |
|-------|------|------------|
| `id` | inteiro | gerado pelo servidor |
| `codigo` | texto | `A-001` (normal) ou `P-001` (preferencial); gerado pelo servidor |
| `nome` | texto | **obrigatório**; 3 a 30 letras minúsculas |
| `tipo` | `"A"` \| `"P"` | **obrigatório** na criação; não pode ser alterado depois |
| `tipo_descricao` | texto | `normal` ou `preferencial` |
| `atendida` | booleano | passa a `true` ao ser chamada |
| `criada_em` / `atendida_em` | data-hora ISO 8601 | `atendida_em` é `null` enquanto aguarda |
| `espera_ms` | inteiro \| null | tempo de espera, calculado quando atendida |

**HistoricoDiario** — um registro por dia, atualizado a cada emissão e chamada; é lido por
`GET /api/relatorios/`. Guarda, por dia: senhas **emitidas** e **atendidas** (normais e
preferenciais), a **soma dos tempos de espera** de cada tipo (a média é calculada na consulta) e os
atendimentos por hora.

O repositório também guarda os contadores de numeração (`A-001`, `P-001`) e a regra de chamada
(2 preferenciais para cada 1 normal).

---

## 4. Endpoints

| Método | Rota | Descrição | Sucesso |
|--------|------|-----------|---------|
| `GET` | `/api/senhas/` | Lista senhas (filtros: `tipo`, `atendida`, `nome`) | 200 |
| `GET` | `/api/senhas/{id}/` | Consulta uma senha | 200 |
| `POST` | `/api/senhas/` | Cria (emite) uma senha | 201 + `Location` |
| `PUT` | `/api/senhas/{id}/` | Altera (exige `nome`) | 200 |
| `PATCH` | `/api/senhas/{id}/` | Altera parcialmente | 200 |
| `DELETE` | `/api/senhas/{id}/` | Remove a senha | 204 (sem corpo) |
| `GET` | `/api/fila/` | Senhas pendentes na ordem de chamada | 200 |
| `POST` | `/api/atendimentos/` | Chama a próxima senha da fila | 201 (ou 200 se a fila está vazia) |
| `GET` | `/api/relatorios/?de=&ate=` | Relatório consolidado (datas `AAAA-MM-DD`, opcionais) | 200 |
| `POST` | `/api/relatorios/importacao/` | Importa dias de exemplo (`src/data/historico-exemplo.json`) | 201 |
| `DELETE` | `/api/relatorios/exemplos/` | Remove só os dias de exemplo | 200 |

A barra final é opcional (`/api/senhas` e `/api/senhas/` funcionam).
Requisições com corpo usam `Content-Type: application/json`.

### Regras e validações

- `nome`: 3 a 30 letras minúsculas (`^[a-z]{3,30}$`); `tipo`: `"A"` ou `"P"`.
- `PUT` exige `nome`; `PATCH` aceita só os campos enviados (ao menos um). Em ambos, enviar um `tipo`
  diferente do atual é erro (a numeração `A-`/`P-` e o histórico dependem dele).
- Senha **já atendida** não pode ser alterada (`409`).
- `DELETE` remove a senha; os números já contabilizados no histórico diário não mudam.
- Filtros e datas inválidos retornam `400` em vez de serem ignorados.

### Códigos HTTP usados

| Código | Quando |
|--------|--------|
| 200 | Consulta ou alteração bem-sucedida |
| 201 | Senha criada / senha chamada / dias importados |
| 204 | Senha removida |
| 400 | JSON inválido, campo inválido, ID não numérico, filtro ou período inválido |
| 404 | Senha inexistente ou rota desconhecida |
| 405 | Método não permitido no recurso |
| 409 | Alteração de senha já atendida |

### Formato de erro (igual em todos os casos)

```json
{
  "sucesso": false,
  "erro": "Dados inválidos.",
  "codigo": "VALIDACAO",
  "detalhes": { "nome": "Use de 3 a 30 letras minúsculas, sem espaços, números ou símbolos." }
}
```

`detalhes` só aparece nos erros de validação. Códigos: `VALIDACAO`, `JSON_INVALIDO`, `ID_INVALIDO`,
`SENHA_NAO_ENCONTRADA`, `ROTA_NAO_ENCONTRADA`, `METODO_NAO_PERMITIDO`, `SENHA_JA_ATENDIDA`.

---

## 5. Exemplos de requisições e respostas

### Criar senha — `POST /api/senhas/`

```bash
curl -i -X POST http://127.0.0.1:8001/api/senhas/ \
  -H "Content-Type: application/json" \
  -d '{"nome": "ana", "tipo": "A"}'
```

```http
HTTP/1.1 201 Created
Location: /api/senhas/1/

{
  "id": 1,
  "codigo": "A-001",
  "nome": "ana",
  "tipo": "A",
  "tipo_descricao": "normal",
  "atendida": false,
  "criada_em": "2026-11-19T17:40:56.905750-03:00",
  "atendida_em": null,
  "espera_ms": null
}
```

### Dados inválidos — `POST /api/senhas/`

```bash
curl -i -X POST http://127.0.0.1:8001/api/senhas/ \
  -H "Content-Type: application/json" -d '{"nome": "Ana1", "tipo": "X"}'
```

```http
HTTP/1.1 400 Bad Request

{
  "sucesso": false,
  "erro": "Dados inválidos.",
  "codigo": "VALIDACAO",
  "detalhes": {
    "nome": "Use de 3 a 30 letras minúsculas, sem espaços, números ou símbolos.",
    "tipo": "Use \"A\" (normal) ou \"P\" (preferencial)."
  }
}
```

### Listar com filtros — `GET /api/senhas/?tipo=P&atendida=false`

```http
HTTP/1.1 200 OK

{
  "total": 1,
  "dados": [
    {
      "id": 3, "codigo": "P-001", "nome": "caio", "tipo": "P", "tipo_descricao": "preferencial",
      "atendida": false, "criada_em": "2026-11-19T17:40:56.930078-03:00",
      "atendida_em": null, "espera_ms": null
    }
  ]
}
```

### Consultar por ID — `GET /api/senhas/999/`

```http
HTTP/1.1 404 Not Found

{ "sucesso": false, "erro": "Senha com ID 999 não encontrada.", "codigo": "SENHA_NAO_ENCONTRADA" }
```

### Alterar — `PATCH /api/senhas/2/` e `PUT /api/senhas/2/`

```bash
curl -X PATCH http://127.0.0.1:8001/api/senhas/2/ \
  -H "Content-Type: application/json" -d '{"nome": "beatriz"}'
```

```http
HTTP/1.1 200 OK

{ "id": 2, "codigo": "A-002", "nome": "beatriz", "tipo": "A", "tipo_descricao": "normal",
  "atendida": false, "criada_em": "2026-11-19T17:40:56.920773-03:00", "atendida_em": null, "espera_ms": null }
```

Tentativa de mudar o tipo → `400` com `detalhes.tipo = "O tipo da senha não pode ser alterado."`.
Senha já atendida → `409`:

```json
{ "sucesso": false, "erro": "Senha já atendida não pode ser alterada.", "codigo": "SENHA_JA_ATENDIDA" }
```

### Remover — `DELETE /api/senhas/3/`

```http
HTTP/1.1 204 No Content
```

Repetir a chamada devolve `404` (`SENHA_NAO_ENCONTRADA`).

### Chamar próxima — `POST /api/atendimentos/`

```http
HTTP/1.1 201 Created

{ "senha": { "id": 3, "codigo": "P-001", "nome": "caio", "tipo": "P", "tipo_descricao": "preferencial",
             "atendida": true, "criada_em": "2026-11-19T17:40:56.930078-03:00",
             "atendida_em": "2026-11-19T17:41:02.986311-03:00", "espera_ms": 6056 } }
```

Fila vazia: `200` com `{ "senha": null, "mensagem": "Não há senhas na fila." }`.

### Ver fila — `GET /api/fila/`

```json
{ "total": 4, "proxima": { "codigo": "P-002", "...": "..." },
  "dados": [ { "codigo": "P-002", "...": "..." }, { "codigo": "A-001", "...": "..." } ] }
```

### Relatório — `GET /api/relatorios/?de=2026-11-19&ate=2026-11-19`

```http
HTTP/1.1 200 OK

{
  "periodo": { "de": "2026-11-19", "ate": "2026-11-19" },
  "resumo": {
    "dias": 1, "diasExemplo": 0,
    "emitidas":  { "A": 2, "P": 3, "total": 5 },
    "atendidas": { "A": 2, "P": 3, "total": 5 },
    "esperaMediaMs": { "A": 6088.5, "P": 6030.0, "geral": 6053.4 }
  },
  "dias": [
    { "date": "2026-11-19", "exemplo": false,
      "emitidas": { "A": 2, "P": 3 }, "atendidas": { "A": 2, "P": 3 },
      "esperaMediaMs": { "A": 6088.5, "P": 6030.0, "geral": 6053.4 } }
  ],
  "porHora": [ { "hora": "17", "A": 2, "P": 3, "total": 5 } ]
}
```

Período inválido (`de` > `ate` ou formato errado) → `400` com `detalhes.de`.
`esperaMediaMs` é `null` quando não há atendimentos.

### Importar dias de exemplo — `POST /api/relatorios/importacao/`

Corpo: o conteúdo de `src/data/historico-exemplo.json` (`{"dias": [...]}`).

```http
HTTP/1.1 201 Created

{ "importados": 20, "ignorados": 0 }
```

Dias que já têm dados reais são preservados (contam em `ignorados`).
`DELETE /api/relatorios/exemplos/` remove só os dias de exemplo: `{ "removidos": 20 }`.

---

## 6. Observação

Nesta etapa a API roda separada e sem banco de dados. As telas em `src/` continuam usando o serviço simulado da etapa 05
(`localStorage`); para ligá-las à API basta trocar o transporte do `ApiClient`
(`src/js/api/apiClient.js`) por uma função com `fetch()` apontando para `/api/`, mantendo os mesmos
contratos de rota (`/senhas`, `/atendimentos`, `/relatorios`).
