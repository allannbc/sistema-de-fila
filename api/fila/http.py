"""Helpers HTTP/JSON: leitura do corpo, formato único de erro e despacho por método."""
import json
from functools import wraps

from django.http import JsonResponse

from .dominio import BancoIndisponivel, ConflitoPersistencia, ErroPersistencia


def erro(status, mensagem, codigo, detalhes=None):
    corpo = {"sucesso": False, "erro": mensagem, "codigo": codigo}
    if detalhes:
        corpo["detalhes"] = detalhes
    return JsonResponse(corpo, status=status, json_dumps_params={"ensure_ascii": False})


def ok(dados, status=200):
    return JsonResponse(dados, status=status, safe=False, json_dumps_params={"ensure_ascii": False})


class ErroApi(Exception):
    """Levantada pelas views; vira a resposta de erro padronizada."""
    def __init__(self, status, mensagem, codigo, detalhes=None):
        self.resposta = erro(status, mensagem, codigo, detalhes)


def ler_json(request):
    try:
        corpo = json.loads(request.body.decode("utf-8") or "null")
    except (ValueError, UnicodeDecodeError):
        raise ErroApi(400, "O corpo da requisição não é um JSON válido.", "JSON_INVALIDO")
    if not isinstance(corpo, dict):
        raise ErroApi(400, "O corpo da requisição deve ser um objeto JSON.", "JSON_INVALIDO")
    return corpo


def rota(**metodos):
    """Despacha por método HTTP; método não suportado -> 405 com cabeçalho Allow."""
    permitidos = ", ".join(sorted(metodos))

    def view(request, **kwargs):
        funcao = metodos.get(request.method)
        if funcao is None:
            resposta = erro(405, f"Método {request.method} não permitido neste recurso.",
                            "METODO_NAO_PERMITIDO")
            resposta["Allow"] = permitidos
            return resposta
        try:
            return funcao(request, **kwargs)
        except ErroApi as e:
            return e.resposta
        except BancoIndisponivel:
            return erro(503, "Banco de dados indisponível. Tente novamente em instantes.", "BANCO_INDISPONIVEL")
        except ConflitoPersistencia:
            return erro(409, "A operação conflita com os dados já gravados.", "CONFLITO_PERSISTENCIA")
        except ErroPersistencia:
            return erro(500, "Erro ao acessar o banco de dados.", "ERRO_PERSISTENCIA")
    return view


def rota_nao_encontrada(request, *args, **kwargs):
    return erro(404, f"Rota não encontrada: {request.method} {request.path}", "ROTA_NAO_ENCONTRADA")
