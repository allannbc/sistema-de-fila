# Sistema de Fila

Essa aplicação tem como objetivo facilitar o registro e uso de uma fila de espera.

Ela pode ser usada para registrar uma pessoa na fila e obter o próximo registro a ser
atendido, com suporte para registros prioritários.

## Descrição do Problema

Em muitos estabelecimentos (bancos, clínicas, repartições públicas, etc.), o gerenciamento manual de filas gera:

- Desorganização e perda de tempo.

- Dificuldade em priorizar atendimentos especiais (idosos, gestantes, PCDs, etc.).

- Falta de transparência sobre o tempo de espera.

- Dificuldade em gerar relatórios e métricas de atendimento.

## Público-alvo

1. Estabelecimentos com grande fluxo de pessoas (bancos, hospitais, clínicas, órgãos públicos, lojas, restaurantes).

2. Atendentes e gerentes que operam o sistema.

3. Clientes/usuários finais que aguardam atendimento.

## Objetivo Principal

Digitalizar e otimizar o processo de gerenciamento de filas, garantindo:

- Atendimento justo e priorização automática de casos especiais.

- Redução do tempo de espera.

- Transparência e previsibilidade para os usuários.

- Geração de dados para melhoria contínua do atendimento.

## Funcionalidades

1. Geração automática de senhas com numeração sequencial e indicação de prioridade.

2. Chamada de senhas para atendimento (com exibição em painel e som).

3. Gestão de prioridades (idosos, gestantes, PCDs, etc.) com alternância inteligente (ex.: 2 preferenciais, 1 normal).

4. Visão geral de todas as senhas registradas no dia.

5. Relatórios gerenciais (tempo médio de espera, número de atendidos por dia, eficiência por atendente).

## Entidades/Conceitos

- Senha – identificador único, data/hora de emissão, tipo (normal/preferencial), status (aguardando, chamado, atendido, cancelado).

- Atendente – profissional que realiza o atendimento, com vínculo ao guichê/balcão.

- Fila – conjunto de senhas ativas, organizadas por ordem de prioridade e chegada.

## Telas

1. Tela de Emissão de Senha (Painel do Cliente)

    * Botão para gerar senha normal ou preferencial com nome.

2. Tela do Atendente (Painel de Controle)

    * Lista de senhas aguardando, com destaque para prioridades.

    * Botão "Chamar Próximo" (que respeita a regra de prioridade).

    * Botão para gerar relatório.

3. Tela de Monitoramento (Painel Público / Gerencial)

    * Exibição em tempo real da senha sendo chamada.

    * Fila de espera (quantos faltam para cada senha).

    * Métricas rápidas (tempo médio, total atendidos hoje).

## Operações

1. Criar novo registro do cliente normal ou preferêncial na fila.

2. Chamar a próxima senha na fila.

3. Gerar um relatório de tempo médio de espera ou número de atendimentos no dia.

4. Ignorar a próxima senha.

5. Mostrar todas as senhas atuais ainda não atendidas.

# Documentos

[Documentação da etapa 2](docs/etapa-02.md)

[Documentação da etapa 3](docs/etapa-03.md)

[Documentação da etapa 4](docs/etapa-04.md)
