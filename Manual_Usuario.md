# Funcionalidades do sistema
1. Página inicial

A página inicial apresenta cards de resumo com indicadores como:

voluntários ativos

atendimentos do dia

quantidade de assistidos com apometria única

taxa de abandono

2. Cadastro de assistidos

Permite registrar novos assistidos com:

CPF

nome

telefone

e-mail

No banco, o CPF é usado como identificador principal (_id da coleção assistidos).

3. Cadastro de voluntários

Permite cadastrar voluntários com:

CPF

nome

telefone

e-mail

mediunidade

disponibilidade por terapia e por dia

O sistema também permite atualização de um voluntário já existente.

4. Solicitação de atendimento

Permite registrar solicitações de atendimento de apometria.

O sistema:

verifica o limite de atendimento configurado

calcula a posição da pessoa no dia

define automaticamente se a solicitação entra como:

Aprovado

Pendente / Lista de espera

5. Registro de atendimentos

O sistema permite registrar atendimentos em várias terapias, como por exemplo:

apométrico

aurículo

reiki

mãos sem fronteiras

homeopático

passe

Cada atendimento registra:

data

CPF do assistido

nome do assistido

voluntário responsável

observações

tipo da terapia

6. Busca automática por CPF

Nas telas de atendimento, ao informar o CPF do assistido, o sistema:

busca automaticamente os dados do assistido

carrega os últimos 12 atendimentos daquela terapia

Isso ajuda o trabalhador a consultar rapidamente o histórico antes de registrar um novo atendimento.

7. Escala de voluntários

A rota de escala permite consultar voluntários por:

dia

terapia

Com isso é possível identificar quem está disponível para determinada atividade.

Relatórios disponíveis
1. Relatório de apometria inativos

Tela com assistidos que:

já fizeram apometria

não tiveram novos atendimentos nos últimos 30, 60 ou 90 dias

Esse relatório ajuda a equipe a identificar possíveis abandonos ou casos para acompanhamento.

2. Relatório de atendimentos de hoje

Tela com todos os atendimentos registrados no dia atual, com filtros por terapia.

Exibe informações como:

data/hora

tipo

CPF

nome do assistido

voluntário

observações

Como usar o sistema
Fluxo básico recomendado
1. Cadastrar o assistido

Antes de registrar atendimentos, faça o cadastro do assistido com CPF, nome e contato.

2. Cadastrar voluntários

Cadastre os voluntários e preencha as disponibilidades por terapia.

3. Registrar solicitação de atendimento

Quando houver demanda por apometria, use a tela de solicitação para controlar aprovação e fila de espera.

4. Registrar o atendimento

Na tela da terapia desejada:

informe a data

informe o CPF do assistido

aguarde a busca automática do nome e do histórico

informe o voluntário

registre as observações

salve o atendimento

5. Consultar relatórios

Use os relatórios para acompanhar:

atendimentos realizados hoje

assistidos inativos após apometria

Rotas principais
Navegação

/ — página inicial

/cadastro — cadastro de assistidos

/cadastro_mediuns — cadastro de voluntários

/solicitacao_atendimento — solicitação de atendimento

Atendimentos

/atendimento/apometrico

/atendimento/auriculo

/atendimento/reiki

/atendimento/maos_sem_fronteiras

/atendimento/homeopatico

/atendimento/passe

APIs auxiliares

/api/assistido/:cpf — busca dados do assistido

/api/historico/:tipo/:cpf — retorna histórico dos últimos 12 atendimentos daquela terapia

Relatórios

/relatorios/apometria-inativos

/relatorios/atendimentos-hoje

Coleções esperadas no MongoDB

O sistema utiliza principalmente as coleções:

assistidos

voluntarios

atendimento

solicitacaos / solicitacao (conforme o model configurado)

terapias

limite_atendimento