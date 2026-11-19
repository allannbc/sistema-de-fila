from django.urls import re_path

from . import views
from .http import rota

# Rotas aceitam barra final opcional (/api/senhas e /api/senhas/).
urlpatterns = [
    # Recurso principal: senhas
    re_path(r"^senhas/?$", rota(GET=views.listar_senhas, POST=views.criar_senha)),
    re_path(r"^senhas/(?P<pk>[^/]+)/?$", rota(GET=views.detalhar_senha, PUT=views.substituir_senha,
                                              PATCH=views.atualizar_senha, DELETE=views.remover_senha)),

    # Fila e atendimento
    re_path(r"^fila/?$", rota(GET=views.ver_fila)),
    re_path(r"^atendimentos/?$", rota(POST=views.chamar_proxima)),

    # Relatório (histórico diário)
    re_path(r"^relatorios/?$", rota(GET=views.consultar_relatorio)),
    re_path(r"^relatorios/importacao/?$", rota(POST=views.importar_exemplos)),
    re_path(r"^relatorios/exemplos/?$", rota(DELETE=views.remover_exemplos)),
]
