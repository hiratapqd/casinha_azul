# Sistema da Casinha Azul
## inicio
a tela inicial mostra 3 cards, quantidade de voluntarios ativos, atendimentos hoje, taxa de abandono (percentagem de assistidos que fizeram apenas a apometria e nanhum outro tratamento)

## Cadastro
o cadastro de assistidos utiliza o CPF como chave primaria, o que impede a duplicação. Não é permitido duplicação do registro de assistidos

## solicitação de atendimento
O foco da Casinha Azul é a apometria, a solicitação de atendimento é somente apometrico.
temos uma tabela com o limite de atendimento do dia.
a solicitação de atendimento apometrico coleta os dados e os primeiros assistidos até o limite do dia são automaticamente aprovados, +4 na lista de espera

## atendimento
focado no preenchimento pelo Dirigente Apometrico, voluntario do Reiki, Auriculo, Homeopata ou mãos sem fronteiras
depois de inserir o cpf, os ultimos 12 atendimentos serão automaticamente carregados, assim como o nome.

## Voulntários
focado no Cadastro de voluntarios onde usamos também o cpf como chave primaria

criei uma escala de voluntarios para ajudar na programação do dia


## Relatorios
	deixei 2 relatórios prontos 
	assistidos que fizeram 1 apometria e nenhum outro atendimento
	lista de todos os atendimentos do dia

