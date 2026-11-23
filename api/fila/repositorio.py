"""Repositório: ÚNICO módulo que fala com o banco (Django ORM / PostgreSQL).

- Recebe e devolve objetos de `dominio.py`, nunca modelos do ORM.
- Traduz qualquer exceção do banco para os erros de `dominio.py`.
- Para trocar de banco (ou de tecnologia), basta reescrever este arquivo.
"""
import logging
from contextlib import contextmanager
from functools import wraps

from django.db import DatabaseError, IntegrityError, InterfaceError, OperationalError, transaction
from django.db.models import F

from . import models as m
from .dominio import BancoIndisponivel, ConflitoPersistencia, ErroPersistencia, HistoricoDiario, Senha

log = logging.getLogger("fila.persistencia")


def _traduzir(exc):
    """Converte exceção do banco no erro de domínio correspondente."""
    if isinstance(exc, (OperationalError, InterfaceError)):
        log.error("Banco indisponível: %s", exc)
        return BancoIndisponivel("Banco de dados indisponível no momento.")
    if isinstance(exc, IntegrityError):
        log.warning("Conflito de integridade: %s", exc)
        return ConflitoPersistencia("A operação violou uma regra de integridade do banco.")
    log.exception("Erro de persistência")
    return ErroPersistencia("Erro ao acessar o banco de dados.")


def _protege(funcao):
    @wraps(funcao)
    def interna(*args, **kwargs):
        try:
            return funcao(*args, **kwargs)
        except (DatabaseError, InterfaceError) as exc:
            raise _traduzir(exc) from exc
    return interna


@contextmanager
def transacao():
    """Tudo dentro do bloco é gravado junto ou desfeito junto (inclusive no commit)."""
    try:
        with transaction.atomic():
            yield
    except (DatabaseError, InterfaceError) as exc:
        raise _traduzir(exc) from exc


# ---------------------------------------------------------------- conversões

def _senha(o):
    return Senha(id=o.id, codigo=o.codigo, nome=o.nome, tipo=o.tipo, criada_em=o.criada_em,
                 dia=o.dia.data, atendida=o.atendida, atendida_em=o.atendida_em)


def _historico(o):
    return HistoricoDiario(
        data=o.data, exemplo=o.exemplo,
        emitidas_a=o.emitidas_a, emitidas_p=o.emitidas_p,
        atendidas_a=o.atendidas_a, atendidas_p=o.atendidas_p,
        espera_total_ms_a=o.espera_total_ms_a, espera_total_ms_p=o.espera_total_ms_p,
        por_hora={f"{h.hora:02d}": {"A": h.atendidas_a, "P": h.atendidas_p} for h in o.horas.all()},
    )


# ---------------------------------------------------------------- senhas

@_protege
def listar_senhas(tipo=None, atendida=None, nome=None):
    qs = m.Senha.objects.select_related("dia")
    if tipo is not None:
        qs = qs.filter(tipo=tipo)
    if atendida is not None:
        qs = qs.filter(atendida=atendida)
    if nome:
        qs = qs.filter(nome__icontains=nome)
    return [_senha(o) for o in qs.order_by("id")]


@_protege
def obter_senha(pk):
    o = m.Senha.objects.select_related("dia").filter(pk=pk).first()
    return _senha(o) if o else None


@_protege
def senhas_pendentes():
    qs = m.Senha.objects.select_related("dia").filter(atendida=False).order_by("id")
    return [_senha(o) for o in qs]


@_protege
def criar_senha(nome, tipo, quando, dia):
    """Gera o próximo número do tipo (com lock na linha de estado) e grava a senha."""
    estado = m.EstadoFila.objects.select_for_update().get_or_create(pk=1)[0]
    if tipo == "A":
        estado.contador_a += 1
        numero = estado.contador_a
    else:
        estado.contador_p += 1
        numero = estado.contador_p
    estado.save(update_fields=["contador_a", "contador_p"])

    historico = _dia(dia)
    o = m.Senha.objects.create(codigo=f"{tipo}-{numero:03d}", nome=nome, tipo=tipo,
                               criada_em=quando, dia=historico)
    return _senha(o)


@_protege
def renomear_senha(pk, nome):
    return m.Senha.objects.filter(pk=pk).update(nome=nome) > 0


@_protege
def remover_senha(pk):
    apagadas, _ = m.Senha.objects.filter(pk=pk).delete()
    return apagadas > 0


@_protege
def marcar_atendida(pk, quando):
    return m.Senha.objects.filter(pk=pk, atendida=False).update(atendida=True, atendida_em=quando) > 0


# ---------------------------------------------------------------- estado da fila

@_protege
def preferenciais_seguidas(bloquear=False):
    qs = m.EstadoFila.objects.select_for_update() if bloquear else m.EstadoFila.objects
    return qs.get_or_create(pk=1)[0].preferenciais_seguidas


@_protege
def definir_preferenciais_seguidas(valor):
    m.EstadoFila.objects.filter(pk=1).update(preferenciais_seguidas=valor)


# ---------------------------------------------------------------- histórico diário

def _dia(data):
    return m.HistoricoDiario.objects.get_or_create(data=data)[0]


@_protege
def somar_emissao(data, tipo):
    campo = "emitidas_a" if tipo == "A" else "emitidas_p"
    m.HistoricoDiario.objects.filter(pk=_dia(data).pk).update(**{campo: F(campo) + 1})


@_protege
def somar_atendimento(data, hora, tipo, espera_ms):
    sufixo = "a" if tipo == "A" else "p"
    dia = _dia(data)
    m.HistoricoDiario.objects.filter(pk=dia.pk).update(**{
        f"atendidas_{sufixo}": F(f"atendidas_{sufixo}") + 1,
        f"espera_total_ms_{sufixo}": F(f"espera_total_ms_{sufixo}") + espera_ms,
    })
    linha, _ = m.HistoricoHora.objects.get_or_create(historico=dia, hora=hora)
    m.HistoricoHora.objects.filter(pk=linha.pk).update(**{f"atendidas_{sufixo}": F(f"atendidas_{sufixo}") + 1})


@_protege
def listar_historico(de=None, ate=None):
    qs = m.HistoricoDiario.objects.prefetch_related("horas")
    if de:
        qs = qs.filter(data__gte=de)
    if ate:
        qs = qs.filter(data__lte=ate)
    return [_historico(o) for o in qs.order_by("data")]


@_protege
def salvar_dia_exemplo(h):
    """Grava um dia de exemplo; dias reais já existentes são preservados (devolve False)."""
    existente = m.HistoricoDiario.objects.filter(data=h.data).first()
    if existente and not existente.exemplo:
        return False
    o, _ = m.HistoricoDiario.objects.update_or_create(data=h.data, defaults={
        "exemplo": True,
        "emitidas_a": h.emitidas_a, "emitidas_p": h.emitidas_p,
        "atendidas_a": h.atendidas_a, "atendidas_p": h.atendidas_p,
        "espera_total_ms_a": h.espera_total_ms_a, "espera_total_ms_p": h.espera_total_ms_p,
    })
    o.horas.all().delete()
    m.HistoricoHora.objects.bulk_create([
        m.HistoricoHora(historico=o, hora=int(hora), atendidas_a=v["A"], atendidas_p=v["P"])
        for hora, v in h.por_hora.items()
    ])
    return True


@_protege
def remover_exemplos():
    """Remove só dias de exemplo sem senhas vinculadas. Devolve quantos dias foram removidos."""
    _, por_modelo = m.HistoricoDiario.objects.filter(exemplo=True, senhas__isnull=True).delete()
    return por_modelo.get("fila.HistoricoDiario", 0)
