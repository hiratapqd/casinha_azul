# Casinha Azul

Sistema web para gestão de atendimentos fraternos da **Casinha Azul**, com cadastro de assistidos e voluntários, solicitações de atendimento, registro de terapias e relatórios operacionais.

## Visão geral

O sistema foi desenvolvido em **Node.js + Express + EJS**, com persistência em **MongoDB Atlas**.

Ele permite:

- cadastrar assistidos
- cadastrar voluntários e suas disponibilidades
- registrar solicitações de atendimento
- registrar atendimentos por terapia
- consultar histórico por CPF
- visualizar escala de voluntários
- acompanhar relatórios de inatividade e atendimentos do dia

## Tecnologias utilizadas

- Node.js
- Express
- EJS
- MongoDB Atlas
- Mongoose
- dotenv

## Estrutura principal do projeto

```text
casinha-azul/
├── models/
│   ├── Atendimento.js
│   ├── Assistido.js
│   ├── Solicitacao.js
│   └── Voluntario.js
├── public/
│   ├── images/
│   └── styles/
│       └── styles.css
├── views/
│   ├── atendimento/
│   ├── relatorios/
│   ├── partials/
│   └── *.ejs
├── server.js
├── package.json
└── .env
Pré-requisitos

Antes de iniciar, você precisa ter instalado:

Node.js

npm

uma conta no MongoDB Atlas

Configuração do ambiente

Crie um arquivo .env na raiz do projeto com a variável:

MONGODB_URI=mongodb+srv://USUARIO:SENHA@SEUCLUSTER.mongodb.net/casinha_azul

Importante: não versionar o .env no GitHub.

Instalação

Instale as dependências:

npm install
Execução local

Inicie o servidor com:

node server.js

ou, se houver script no package.json:

npm start

O sistema ficará disponível em:

http://localhost:3000

Observações importantes
1. Variável de ambiente

A conexão com o MongoDB depende da variável:

MONGODB_URI
2. Arquivos estáticos

O projeto serve a pasta public/ com:

CSS

imagens

logotipo

3. Fuso horário

O sistema possui funções para salvar atendimentos com data e hora ajustadas ao fuso America/Sao_Paulo.

4. Modelagem atual

Hoje existem rotas específicas para alguns tipos de atendimento e uma rota dinâmica POST /atendimento/:tipo. Conforme o sistema evoluir, vale padronizar todas as telas para aproveitar a rota dinâmica.



