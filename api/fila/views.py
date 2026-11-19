"""Views da API. Cada função trata um método HTTP; o roteamento por método está em urls.py."""
from django.http import HttpResponse

from . import services, validators
from .http import ErroApi, erro, ler_json, ok


def _obter_senha(pk):
    if not str(pk).isdigit():
        raise ErroApi(400, "O ID deve ser um número inteiro positivo.", "ID_INVALIDO")
    senha = services.obter_senha(int(pk))
    if senha is None:
        raise ErroApi(404, f"Senha com ID {pk} não encontrada.", "SENHA_NAO_ENCONTRADA")
    return senha


# ---------------------------------------------------------------- /api/senhas/

def listar_senhas(request):
    detalhes = {}

    tipo = request.GET.get("tipo")
    if tipo is not None and tipo not in ("A", "P"):
        detalhes["tipo"] = 'Use "A" ou "P".'

    atendida = request.GET.get("atendida")
    if atendida is not None and atendida not in ("true", "false"):
        detalhes["atendida"] = 'Use "true" ou "false".'

    if detalhes:
        validators.levantar(detalhes)

    senhas = services.listar_senhas(
        tipo=tipo,
        atendida=None if atendida is None else atendida == "true",
        nome=request.GET.get("nome"),
    )
    dados = [s.para_json() for s in senhas]
    return ok({"total": len(dados), "dados": dados})


def criar_senha(request):
    corpo = ler_json(request)
    detalhes = {}
    nome = validators.validar_nome(corpo.get("nome"), detalhes)
    tipo = validators.validar_tipo(corpo.get("tipo"), detalhes)
    if detalhes:
        validators.levantar(detalhes)

    senha = services.emitir_senha(nome, tipo)
    resposta = ok(senha.para_json(), status=201)
    resposta["Location"] = f"/api/senhas/{senha.id}/"
    return resposta


def detalhar_senha(request, pk):
    return ok(_obter_senha(pk).para_json())


def _editar_senha(request, pk, parcial):
    senha = _obter_senha(pk)
    corpo = ler_json(request)
    detalhes = {}

    if senha.atendida:
        raise ErroApi(409, "Senha já atendida não pode ser alterada.", "SENHA_JA_ATENDIDA")

    if "nome" in corpo or not parcial:
        nome = validators.validar_nome(corpo.get("nome"), detalhes)
    else:
        nome = senha.nome

    # O tipo define a numeração (A-/P-) e o histórico; não pode mudar depois da emissão.
    if "tipo" in corpo and corpo["tipo"] != senha.tipo:
        detalhes["tipo"] = "O tipo da senha não pode ser alterado."

    if parcial and "nome" not in corpo and "tipo" not in corpo:
        detalhes["nome"] = "Envie ao menos um campo para alterar."

    if detalhes:
        validators.levantar(detalhes)

    senha.nome = nome
    return ok(senha.para_json())


def substituir_senha(request, pk):
    return _editar_senha(request, pk, parcial=False)


def atualizar_senha(request, pk):
    return _editar_senha(request, pk, parcial=True)


def remover_senha(request, pk):
    _obter_senha(pk)  # 404 se não existir
    services.remover_senha(int(pk))
    return HttpResponse(status=204)


# ---------------------------------------------------------------- /api/fila/ e /api/atendimentos/

def ver_fila(request):
    pendentes = services.fila_ordenada()
    dados = [s.para_json() for s in pendentes]
    return ok({"total": len(dados), "proxima": dados[0] if dados else None, "dados": dados})


def chamar_proxima(request):
    senha = services.chamar_proxima()
    if senha is None:
        return ok({"senha": None, "mensagem": "Não há senhas na fila."})
    return ok({"senha": senha.para_json()}, status=201)


# ---------------------------------------------------------------- /api/relatorios/

def consultar_relatorio(request):
    de, ate = validators.validar_periodo(request.GET)
    return ok(services.relatorio(de, ate))


def importar_exemplos(request):
    corpo = ler_json(request)
    dias = corpo.get("dias")
    if not isinstance(dias, list):
        validators.levantar({"dias": "Envie uma lista de dias."})

    detalhes = {}
    for i, dia in enumerate(dias):
        problemas = validators.validar_dia_importacao(dia)
        if problemas:
            detalhes[f"dias[{i}]"] = " ".join(problemas)
    if detalhes:
        validators.levantar(detalhes)

    importados, ignorados = services.importar_exemplos(dias)
    return ok({"importados": importados, "ignorados": ignorados}, status=201)


def remover_exemplos(request):
    return ok({"removidos": services.remover_exemplos()})
