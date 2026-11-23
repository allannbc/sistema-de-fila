"""Configuração: API JSON sobre PostgreSQL, sem sessões, admin ou autenticação."""
import os

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-chave-insegura-trocar-em-producao")
DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"
ALLOWED_HOSTS = ["*"] if DEBUG else os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost").split(",")

INSTALLED_APPS = ["fila"]
MIDDLEWARE = []  # sem CSRF/sessão: a API é stateless e só fala JSON

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

# PostgreSQL. Valores padrão batem com o docker-compose.yml; sobrescreva por variáveis de ambiente.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("DB_NAME", "fila"),
        "USER": os.environ.get("DB_USER", "fila"),
        "PASSWORD": os.environ.get("DB_PASSWORD", "fila"),
        "HOST": os.environ.get("DB_HOST", "127.0.0.1"),
        "PORT": os.environ.get("DB_PORT", "5432"),
        "OPTIONS": {"connect_timeout": int(os.environ.get("DB_CONNECT_TIMEOUT", "5"))},
    }
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "loggers": {"fila.persistencia": {"handlers": ["console"], "level": "INFO"}},
}

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_TZ = True
