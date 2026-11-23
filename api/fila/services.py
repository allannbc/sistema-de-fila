"""Regras de negócio da fila e do histórico diário.

Não importa nada do Django ORM: tudo o que toca o banco passa por `repositorio`.
"""
from django.utils import timezone

from . import repositorio as repo
from .dominio import HistoricoDiario


def _dia_e_hora(momento):
    local = timezone.localtime(momento)
    return local.date(), local.hour


# ---------------------------------------------------------------- senhas

def listar_senhas(tipo=None, atendida=None, nome=None):
    return repo.listar_senhas(tipo=tipo, atendida=atendida, nome=nome)


def obter_senha(pk):
    return repo.obter_senha(pk)


def renomear_senha(pk, nome):
    return repo.renomear_senha(pk, nome)


def remover_senha(pk):
    return repo.remover_senha(pk)


def emitir_senha(nome, tipo):
    agora = timezone.now()
    dia, _ = _dia_e_hora(agora)
    with repo.transacao():
        senha = repo.criar_senha(nome, tipo, agora, dia)
        repo.somar_emissao(dia, tipo)
    return senha


def _ordenar(pendentes, seguidas):
    """2 preferenciais para cada 1 normal."""
    normais = [s for s in pendentes if s.tipo == "A"]
    prefs = [s for s in pendentes if s.tipo == "P"]

    saida, i, j = [], 0, 0
    while i < len(normais) and j < len(prefs):
        if seguidas == 2:
            saida.append(normais[i]); i += 1; seguidas = 0
        else:
            saida.append(prefs[j]); j += 1; seguidas += 1
    saida.extend(normais[i:])
    saida.extend(prefs[j:])
    return saida


def fila_ordenada():
    return _ordenar(repo.senhas_pendentes(), repo.preferenciais_seguidas())


def chamar_proxima():
    """Chama a próxima senha. Devolve a Senha ou None se a fila estiver vazia."""
    with repo.transacao():
        seguidas = repo.preferenciais_seguidas(bloquear=True)  # lock: uma chamada por vez
        fila = _ordenar(repo.senhas_pendentes(), seguidas)
        if not fila:
            return None

        senha = fila[0]
        agora = timezone.now()
        repo.marcar_atendida(senha.id, agora)
        repo.definir_preferenciais_seguidas(min(seguidas + 1, 2) if senha.tipo == "P" else 0)

        dia, hora = _dia_e_hora(agora)
        espera = max(0, int((agora - senha.criada_em).total_seconds() * 1000))
        repo.somar_atendimento(dia, hora, senha.tipo, espera)

    senha.atendida, senha.atendida_em = True, agora
    return senha


# ---------------------------------------------------------------- relatório

def _media(total, qtd):
    return total / qtd if qtd > 0 else None


def relatorio(de=None, ate=None):
    registros = repo.listar_historico(de, ate)

    em = {"A": 0, "P": 0}
    at = {"A": 0, "P": 0}
    esp = {"A": 0, "P": 0}
    horas, dias = {}, []

    for h in registros:
        em["A"] += h.emitidas_a; em["P"] += h.emitidas_p
        at["A"] += h.atendidas_a; at["P"] += h.atendidas_p
        esp["A"] += h.espera_total_ms_a; esp["P"] += h.espera_total_ms_p
        for hora, v in h.por_hora.items():
            c = horas.setdefault(hora, {"A": 0, "P": 0})
            c["A"] += v.get("A", 0); c["P"] += v.get("P", 0)

        dias.append({
            "date": h.data.isoformat(),
            "exemplo": h.exemplo,
            "emitidas": {"A": h.emitidas_a, "P": h.emitidas_p},
            "atendidas": {"A": h.atendidas_a, "P": h.atendidas_p},
            "esperaMediaMs": {
                "A": _media(h.espera_total_ms_a, h.atendidas_a),
                "P": _media(h.espera_total_ms_p, h.atendidas_p),
                "geral": _media(h.espera_total_ms_a + h.espera_total_ms_p, h.atendidas_a + h.atendidas_p),
            },
        })

    total_at = at["A"] + at["P"]
    return {
        "periodo": {"de": de.isoformat() if de else None, "ate": ate.isoformat() if ate else None},
        "resumo": {
            "dias": len(dias),
            "diasExemplo": sum(1 for d in dias if d["exemplo"]),
            "emitidas": {**em, "total": em["A"] + em["P"]},
            "atendidas": {**at, "total": total_at},
            "esperaMediaMs": {
                "A": _media(esp["A"], at["A"]),
                "P": _media(esp["P"], at["P"]),
                "geral": _media(esp["A"] + esp["P"], total_at),
            },
        },
        "dias": dias,
        "porHora": [
            {"hora": h, "A": horas[h]["A"], "P": horas[h]["P"], "total": horas[h]["A"] + horas[h]["P"]}
            for h in sorted(horas)
        ],
    }


def importar_exemplos(dias):
    """Grava dias de exemplo sem sobrescrever dias com dados reais."""
    from .validators import validar_data

    importados = ignorados = 0
    with repo.transacao():
        for d in dias:
            h = HistoricoDiario(
                data=validar_data(d["date"]), exemplo=True,
                emitidas_a=d["emitidas"]["A"], emitidas_p=d["emitidas"]["P"],
                atendidas_a=d["atendidas"]["A"], atendidas_p=d["atendidas"]["P"],
                espera_total_ms_a=d["esperaTotalMs"]["A"], espera_total_ms_p=d["esperaTotalMs"]["P"],
                por_hora={k: {"A": v["A"], "P": v["P"]} for k, v in d.get("porHora", {}).items()},
            )
            if repo.salvar_dia_exemplo(h):
                importados += 1
            else:
                ignorados += 1
    return importados, ignorados


def remover_exemplos():
    return repo.remover_exemplos()
