"""Validação de entradas. Cada função devolve valores limpos ou levanta ErroApi(400)."""
import re
from datetime import date

from .http import ErroApi

NOME_REGEX = re.compile(r"^[a-z]{3,30}$")
HORA_REGEX = re.compile(r"^([01]\d|2[0-3])$")


def levantar(detalhes):
    raise ErroApi(400, "Dados inválidos.", "VALIDACAO", detalhes)


def validar_nome(valor, detalhes):
    if not isinstance(valor, str) or not NOME_REGEX.match(valor):
        detalhes["nome"] = "Use de 3 a 30 letras minúsculas, sem espaços, números ou símbolos."
        return None
    return valor


def validar_tipo(valor, detalhes):
    if valor not in ("A", "P"):
        detalhes["tipo"] = 'Use "A" (normal) ou "P" (preferencial).'
        return None
    return valor


def validar_data(valor):
    """'AAAA-MM-DD' -> date, ou None se inválida."""
    if not isinstance(valor, str) or not re.match(r"^\d{4}-\d{2}-\d{2}$", valor):
        return None
    try:
        return date.fromisoformat(valor)
    except ValueError:
        return None


def validar_periodo(params):
    de, ate = params.get("de"), params.get("ate")
    detalhes = {}
    d_de = d_ate = None
    if de is not None:
        d_de = validar_data(de)
        if d_de is None:
            detalhes["de"] = "Formato esperado: AAAA-MM-DD."
    if ate is not None:
        d_ate = validar_data(ate)
        if d_ate is None:
            detalhes["ate"] = "Formato esperado: AAAA-MM-DD."
    if not detalhes and d_de and d_ate and d_de > d_ate:
        detalhes["de"] = "A data inicial não pode ser maior que a data final."
    if detalhes:
        levantar(detalhes)
    return d_de, d_ate


def validar_booleano(valor, campo):
    mapa = {"true": True, "false": False}
    if valor not in mapa:
        levantar({campo: 'Use "true" ou "false".'})
    return mapa[valor]


def _contagem(valor):
    return isinstance(valor, int) and not isinstance(valor, bool) and valor >= 0


def validar_dia_importacao(dia):
    """Retorna lista de mensagens de erro de um dia do JSON de importação."""
    if not isinstance(dia, dict):
        return ["Deve ser um objeto."]
    problemas = []
    if validar_data(dia.get("date")) is None:
        problemas.append('"date" deve estar no formato AAAA-MM-DD.')
    for grupo in ("emitidas", "atendidas", "esperaTotalMs"):
        g = dia.get(grupo)
        if not isinstance(g, dict) or not _contagem(g.get("A")) or not _contagem(g.get("P")):
            problemas.append(f'"{grupo}" deve ter "A" e "P" inteiros >= 0.')
    por_hora = dia.get("porHora", {})
    if not isinstance(por_hora, dict):
        problemas.append('"porHora" deve ser um objeto.')
    else:
        for hora, v in por_hora.items():
            if not HORA_REGEX.match(str(hora)) or not isinstance(v, dict) \
                    or not _contagem(v.get("A")) or not _contagem(v.get("P")):
                problemas.append(f'"porHora.{hora}" inválido (hora "00"-"23" com "A" e "P" inteiros >= 0).')
    return problemas
