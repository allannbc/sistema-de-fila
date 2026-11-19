"""Configuração mínima: API JSON sem sessões, admin ou autenticação."""
import os

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-chave-insegura-trocar-em-producao")
DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"
ALLOWED_HOSTS = ["*"] if DEBUG else os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost").split(",")

INSTALLED_APPS = []  # sem apps do Django: não há admin, auth nem banco nesta etapa
MIDDLEWARE = []  # sem CSRF/sessão: a API é stateless e só fala JSON

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {}  # sem banco de dados: os dados ficam em memória (fila/repositorio.py)

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_TZ = True
