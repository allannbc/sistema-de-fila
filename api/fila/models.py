"""Modelo do banco (PostgreSQL) via ORM do Django. Só o repositorio.py importa este módulo."""
from django.db import models
from django.db.models import F, Q

TIPOS = [("A", "normal"), ("P", "preferencial")]


class HistoricoDiario(models.Model):
    """1 linha por dia: totais de emissão/atendimento e soma dos tempos de espera."""
    data = models.DateField(unique=True)
    exemplo = models.BooleanField(default=False)
    emitidas_a = models.PositiveIntegerField(default=0)
    emitidas_p = models.PositiveIntegerField(default=0)
    atendidas_a = models.PositiveIntegerField(default=0)
    atendidas_p = models.PositiveIntegerField(default=0)
    espera_total_ms_a = models.PositiveBigIntegerField(default=0)
    espera_total_ms_p = models.PositiveBigIntegerField(default=0)

    class Meta:
        db_table = "historico_diario"
        ordering = ["data"]


class HistoricoHora(models.Model):
    """Atendimentos por hora cheia de um dia (N linhas por HistoricoDiario)."""
    historico = models.ForeignKey(HistoricoDiario, on_delete=models.CASCADE, related_name="horas")
    hora = models.PositiveSmallIntegerField()
    atendidas_a = models.PositiveIntegerField(default=0)
    atendidas_p = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "historico_hora"
        ordering = ["hora"]
        constraints = [
            models.UniqueConstraint(fields=["historico", "hora"], name="uq_historico_hora"),
            models.CheckConstraint(condition=Q(hora__gte=0, hora__lte=23), name="ck_historico_hora_0_23"),
        ]


class Senha(models.Model):
    """Senha emitida no quiosque; pertence ao dia em que foi emitida."""
    codigo = models.CharField(max_length=10, unique=True)
    nome = models.CharField(max_length=30)
    tipo = models.CharField(max_length=1, choices=TIPOS)
    atendida = models.BooleanField(default=False)
    criada_em = models.DateTimeField()
    atendida_em = models.DateTimeField(null=True, blank=True)
    dia = models.ForeignKey(HistoricoDiario, on_delete=models.PROTECT, related_name="senhas")

    class Meta:
        db_table = "senha"
        ordering = ["id"]
        indexes = [models.Index(fields=["atendida", "tipo", "id"], name="ix_senha_fila")]
        constraints = [
            models.CheckConstraint(condition=Q(tipo__in=["A", "P"]), name="ck_senha_tipo"),
            models.CheckConstraint(
                condition=(Q(atendida=True, atendida_em__isnull=False) |
                           Q(atendida=False, atendida_em__isnull=True)),
                name="ck_senha_atendida_coerente"),
            models.CheckConstraint(condition=Q(atendida_em__gte=F("criada_em")) | Q(atendida_em__isnull=True),
                                   name="ck_senha_atendida_apos_criada"),
        ]


class EstadoFila(models.Model):
    """Linha única (id=1): numeração das senhas e regra de 2 preferenciais para 1 normal."""
    contador_a = models.PositiveIntegerField(default=0)
    contador_p = models.PositiveIntegerField(default=0)
    preferenciais_seguidas = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "estado_fila"
        constraints = [
            models.CheckConstraint(condition=Q(preferenciais_seguidas__lte=2), name="ck_estado_pref_max_2"),
        ]
