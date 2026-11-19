"""Regras de negócio da fila e do histórico diário (sem detalhes de HTTP)."""
from django.utils import timezone

from .repositorio import TRAVA, HistoricoDiario, Senha, repo


def _dia_e_hora(momento):
    local = timezone.localtime(momento)
    return local.date(), f"{local.hour:02d}"


# ---------------------------------------------------------------- senhas

def listar_senhas(tipo=None, atendida=None, nome=None):
    with TRAVA:
        senhas = list(repo.senhas.values())
    if tipo is not None:
        senhas = [s for s in senhas if s.tipo == tipo]
    if atendida is not None:
        senhas = [s for s in senhas if s.atendida == atendida]
    if nome:
        senhas = [s for s in senhas if nome.lower() in s.nome.lower()]
    return sorted(senhas, key=lambda s: s.id)


def obter_senha(pk):
    return repo.senhas.get(pk)


def remover_senha(pk):
    with TRAVA:
        return repo.senhas.pop(pk, None) is not None


def emitir_senha(nome, tipo):
    with TRAVA:
        repo.contador[tipo] += 1
        agora = timezone.now()
        senha = Senha(id=repo.proximo_id, codigo=f"{tipo}-{repo.contador[tipo]:03d}",
                      nome=nome, tipo=tipo, criada_em=agora)
        repo.proximo_id += 1
        repo.senhas[senha.id] = senha

        hist = repo.historico_do_dia(_dia_e_hora(agora)[0])
        if tipo == "A":
            hist.emitidas_a += 1
        else:
            hist.emitidas_p += 1
        return senha


def fila_ordenada():
    """Senhas pendentes na ordem de chamada (2 preferenciais para 1 normal)."""
    with TRAVA:
        pendentes = sorted((s for s in repo.senhas.values() if not s.atendida), key=lambda s: s.id)
        seguidas = repo.preferenciais_seguidas

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


def chamar_proxima():
    """Chama a próxima senha da fila. Devolve a Senha ou None se não houver ninguém."""
    with TRAVA:
        pendentes = fila_ordenada()
        if not pendentes:
            return None

        senha = pendentes[0]
        agora = timezone.now()
        senha.atendida = True
        senha.atendida_em = agora

        repo.preferenciais_seguidas = min(repo.preferenciais_seguidas + 1, 2) if senha.tipo == "P" else 0

        dia, hora = _dia_e_hora(agora)
        hist = repo.historico_do_dia(dia)
        espera = max(0, senha.espera_ms())
        if senha.tipo == "A":
            hist.atendidas_a += 1
            hist.espera_total_ms_a += espera
        else:
            hist.atendidas_p += 1
            hist.espera_total_ms_p += espera
        celula = hist.por_hora.setdefault(hora, {"A": 0, "P": 0})
        celula[senha.tipo] += 1
        return senha


# ---------------------------------------------------------------- relatório

def _media(total, qtd):
    return total / qtd if qtd > 0 else None


def relatorio(de=None, ate=None):
    with TRAVA:
        registros = sorted(repo.historico.values(), key=lambda h: h.data)
    registros = [h for h in registros if (not de or h.data >= de) and (not ate or h.data <= ate)]

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
    with TRAVA:
        for d in dias:
            data = validar_data(d["date"])
            existente = repo.historico.get(data)
            if existente and not existente.exemplo:
                ignorados += 1
                continue
            repo.historico[data] = HistoricoDiario(
                data=data, exemplo=True,
                emitidas_a=d["emitidas"]["A"], emitidas_p=d["emitidas"]["P"],
                atendidas_a=d["atendidas"]["A"], atendidas_p=d["atendidas"]["P"],
                espera_total_ms_a=d["esperaTotalMs"]["A"], espera_total_ms_p=d["esperaTotalMs"]["P"],
                por_hora={h: {"A": v["A"], "P": v["P"]} for h, v in d.get("porHora", {}).items()},
            )
            importados += 1
    return importados, ignorados


def remover_exemplos():
    with TRAVA:
        alvo = [data for data, h in repo.historico.items() if h.exemplo]
        for data in alvo:
            del repo.historico[data]
    return len(alvo)
