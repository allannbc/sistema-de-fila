from django.urls import include, path, re_path

from fila.http import rota_nao_encontrada

urlpatterns = [
    path("api/", include("fila.urls")),
    re_path(r"^.*$", rota_nao_encontrada),  # qualquer outra URL: 404 em JSON
]
