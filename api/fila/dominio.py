"""Entidades e erros do domínio, independentes do banco de dados.

Views e services só conhecem estas classes. Quem converte de/para o banco é o repositorio.py.
"""
from dataclasses import dataclass, field
from datetime import date, datetime

from django.utils import timezone

TIPOS = {"A": "normal", "P": "preferencial"}


@dataclass
class Senha:
    id: int
    codigo: str            # ex.: A-001, P-003
    nome: str
    tipo: str              # "A" ou "P"
    criada_em: datetime
    dia: date              # dia de emissão (liga a senha ao histórico diário)
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
            "data": self.dia.isoformat(),
            "atendida": self.atendida,
            "criada_em": timezone.localtime(self.criada_em).isoformat(),
            "atendida_em": timezone.localtime(self.atendida_em).isoformat() if self.atendida_em else None,
            "espera_ms": self.espera_ms(),
        }


@dataclass
class HistoricoDiario:
    data: date
    exemplo: bool = False
    emitidas_a: int = 0
    emitidas_p: int = 0
    atendidas_a: int = 0
    atendidas_p: int = 0
    espera_total_ms_a: int = 0
    espera_total_ms_p: int = 0
    por_hora: dict = field(default_factory=dict)  # {"09": {"A": 3, "P": 1}}


# ---- Erros de persistência (o repositório traduz as exceções do banco para estas) ----

class ErroPersistencia(Exception):
    """Falha inesperada ao gravar/ler no banco."""


class BancoIndisponivel(ErroPersistencia):
    """Não foi possível falar com o banco (desligado, rede, credenciais, timeout)."""


class ConflitoPersistencia(ErroPersistencia):
    """O banco recusou a operação por violar uma regra (unicidade, vínculo, CHECK)."""
