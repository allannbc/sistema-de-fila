"""Armazenamento em memória (sem banco de dados nesta etapa).

Os dados vivem enquanto o servidor estiver rodando e são perdidos ao reiniciá-lo.
A persistência em banco fica para a próxima etapa: basta trocar este módulo.
"""
import threading
from dataclasses import dataclass, field
from datetime import date, datetime

from django.utils import timezone

TIPOS = {"A": "normal", "P": "preferencial"}

TRAVA = threading.RLock()  # o runserver atende requisições em threads


@dataclass
class Senha:
    """Recurso principal: uma senha emitida no quiosque."""
    id: int
    codigo: str  # ex.: A-001, P-003
    nome: str
    tipo: str    # "A" ou "P"
    criada_em: datetime
    atendida: bool = False
    atendida_em: datetime | None = None

    def espera_ms(self):
        if self.atendida_em is None:
            return None
        return int((self.atendida_em - self.criada_em).total_seconds() * 1000)

    def para_json(self):
        return {
            "id": self.id,
            "codigo": self.codigo,
            "nome": self.nome,
            "tipo": self.tipo,
            "tipo_descricao": TIPOS[self.tipo],
            "atendida": self.atendida,
            "criada_em": timezone.localtime(self.criada_em).isoformat(),
            "atendida_em": timezone.localtime(self.atendida_em).isoformat() if self.atendida_em else None,
            "espera_ms": self.espera_ms(),
        }


@dataclass
class HistoricoDiario:
    """Um registro por dia, atualizado a cada emissão/chamada e lido pelo relatório."""
    data: date
    exemplo: bool = False
    emitidas_a: int = 0
    emitidas_p: int = 0
    atendidas_a: int = 0
    atendidas_p: int = 0
    espera_total_ms_a: int = 0
    espera_total_ms_p: int = 0
    por_hora: dict = field(default_factory=dict)  # {"09": {"A": 3, "P": 1}}


class Repositorio:
    def __init__(self):
        self.limpar()

    def limpar(self):
        self.senhas = {}                      # id -> Senha
        self.proximo_id = 1
        self.contador = {"A": 0, "P": 0}      # numeração A-001 / P-001
        self.preferenciais_seguidas = 0       # regra: 2 preferenciais para 1 normal
        self.historico = {}                   # date -> HistoricoDiario

    def historico_do_dia(self, dia):
        return self.historico.setdefault(dia, HistoricoDiario(data=dia))


repo = Repositorio()
