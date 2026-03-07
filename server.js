require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const Atendimento = require('./models/Atendimento');
const Voluntario = require('./models/Voluntario');
const Assistido = require('./models/Assistido');
const Solicitacao = require('./models/Solicitacao');
const app = express();

// --- CONFIGURAÇÕES ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- CONEXÃO COM MONGODB ---
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI)
    .then(() => console.log("✅ Conectado ao MongoDB Atlas 22:43"))
    .catch(err => console.error("❌ Erro ao conectar ao MongoDB:", err));

// Middleware Global
app.use(async (req, res, next) => {
    try {
        const db = mongoose.connection.db;
        if (!db) { res.locals.terapias = []; return next(); }
        const terapiasAtivas = await db.collection("terapias").find({ ativa: true }).sort({ ordem: 1 }).toArray();
        res.locals.terapias = terapiasAtivas;
        next();
    } catch (err) {
        next();
    }
});

// --- ROTA DE FORMULARIOS ---
app.get('/cadastro', (req, res) => res.render('cadastro_assistidos'));
app.get('/', async (req, res) => {
    try {
        const hojeInicio = new Date();
        hojeInicio.setHours(0, 0, 0, 0);
        const hojeFim = new Date();
        hojeFim.setHours(23, 59, 59, 999);

        const dataCorteAbandono = new Date();
        dataCorteAbandono.setDate(dataCorteAbandono.getDate() - 14);

        // 1. Atendimentos e Abandono
        const totalAtendimentosHoje = await Atendimento.countDocuments({
            data: { $gte: hojeInicio, $lte: hojeFim }
        });

        const analiseAbandono = await Atendimento.aggregate([
            { $match: { tipo: 'apometrico' } },
            { $group: { _id: "$cpf_assistido", total: { $sum: 1 }, ultimaData: { $max: "$data" } } },
            { $match: { total: 1, ultimaData: { $lt: dataCorteAbandono } } }
        ]);

        const totalAssistidosGeral = await Atendimento.distinct("cpf_assistido");
        const totalAbandono = analiseAbandono.length;
        const porcentagemAbandono = totalAssistidosGeral.length > 0 
            ? ((totalAbandono / totalAssistidosGeral.length) * 100).toFixed(1) 
            : 0;

        // 2. Voluntários (Ajustado para a estrutura JSON real)
        const voluntariosDB = await Voluntario.find({ esta_ativo: "Sim" }).lean(); // .lean() faz o Mongoose virar JSON puro
        
        const diasTraducao = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
        const hojeAbrev = diasTraducao[new Date().getDay()];

        const labelsFormatados = {
            apometria: "Apometria",
            reiki: "Reiki",
            auriculo: "Aurículo",
            maos: "Mãos sem Fronteiras",
            homeopatia: "Homeopático",
            passe: "Passe",
            cantina: "Cantina",
            mesa: "Mesa"
        };

        const contagemPorTipo = {};
        Object.keys(labelsFormatados).forEach(key => contagemPorTipo[key] = 0);
        const escala_hoje = [];

        voluntariosDB.forEach(v => {
            // Acedemos ao objeto disponibilidade que vimos no teste
            const disp = v.disponibilidade || {};

            for (let mod in labelsFormatados) {
                let diasRaw = disp[mod];

                if (!diasRaw) continue;

                // Converte para array (caso venha string do formulário)
                let listaDias = Array.isArray(diasRaw) ? diasRaw : [diasRaw];

                if (listaDias.length > 0) {
                    contagemPorTipo[mod]++;

                    // Verifica se o dia de hoje (ex: 'sex') está na lista
                    if (listaDias.includes(hojeAbrev)) {
                        escala_hoje.push({ 
                            nome: v.nome, 
                            tipo: labelsFormatados[mod] 
                        });
                    }
                }
            }
        });

        // Prepara o objeto para o index.ejs
        const resumoFinal = {};
        for (let chave in contagemPorTipo) {
            resumoFinal[labelsFormatados[chave]] = contagemPorTipo[chave];
        }

        res.render('index', {
            resumo: {
                hoje: totalAtendimentosHoje,
                taxaAbandono: porcentagemAbandono,
                apometriaUnica: totalAbandono, 
                voluntariosPorTipo: resumoFinal,
                totalVoluntarios: voluntariosDB.length
            },
            escala_hoje
        });

    } catch (err) {
        console.error("Erro Dashboard:", err);
        res.status(500).send("Erro ao carregar painel.");
    }
});

app.get('/solicitacao_atendimento', (req, res) => res.render('solicitacao_atendimento'));
app.get('/relatorios/atendimentos-hoje', (req, res) => {
    res.send("Página de Relatórios de Hoje em construção");
});

app.get('/relatorios/apometria-inativos', (req, res) => {
    res.send("Página de Inativos em construção");
});
app.get('/cadastro_mediuns', (req, res) => {
    res.render('cadastro_mediuns');
});
app.get('/atendimento/apometrico', (req, res) => {
    res.render('atendimento/apometrico', { atendimentos: [] });
});


// --- ROTA DE CADASTRO  ---
app.post('/mediun/novo', async (req, res) => {
    try {
        const { cpf, forceUpdate } = req.body;
        const voluntarioExistente = await Voluntario.findOne({ cpf });

        if (voluntarioExistente && forceUpdate !== 'true') {
            return res.json({ status: 'conflito' });
        }

        const dadosVoluntario = {
            nome: req.body.nome,
            cpf: req.body.cpf,
            telefone: req.body.telefone,
            email: req.body.email,
            mediunidade: req.body.mediunidade,
            esta_ativo: req.body.esta_ativo || "Sim",
            disponibilidade: {
                apometria: req.body.voluntario_apometria_dias || [],
                reiki: req.body.voluntario_reiki_dias || [],
                auriculo: req.body.voluntario_auriculo_dias || [],
                maos: req.body.voluntario_maos_dias || [],
                homeopatia: req.body.voluntario_homeopatia_dias || [],
                cantina: req.body.voluntario_cantina_dias || [],
                passe: req.body.voluntario_passe_dias || [],
                mesa: req.body.voluntario_mesa_dias || []
            }
        };

        if (voluntarioExistente) {
            await Voluntario.updateOne({ cpf }, dadosVoluntario);
            res.json({ status: 'sucesso', acao: 'atualizado' });
        } else {
            const novoVoluntario = new Voluntario(dadosVoluntario);
            await novoVoluntario.save();
            res.json({ status: 'sucesso', acao: 'criado' });
        }
    } catch (err) {
        res.status(500).json({ status: 'erro' });
    }
});

// --- ROTA DE CADASTRO DE ASSISTIDO ---
app.post('/assistido/novo', async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const cpf = req.body.cpf;

        // 1. Verifica se o assistido já existe
        const assistidoExistente = await db.collection('assistidos').findOne({ _id: cpf });

        if (assistidoExistente) {
            // Se existir, enviamos o status 'existente' e o nome para o alerta
            return res.json({ 
                status: 'existente', 
                nome: assistidoExistente.nome 
            });
        }

        // 2. Se não existe, procede com a gravação normal
        const novoAssistido = {
            _id: cpf,
            nome: req.body.nome,
            telefone: req.body.telefone,
            email: req.body.email,
            data_cadastro: new Date().toISOString().split('T')[0]
        };

        await db.collection('assistidos').insertOne(novoAssistido);
        res.json({ status: 'sucesso' });

    } catch (err) {
        console.error("Erro ao cadastrar assistido:", err);
        res.status(500).json({ status: 'erro' });
    }
});
// ROTA DE GRAVAÇÃO DA SOLICITAÇÃO
app.post('/atendimento/solicitacao', async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const dataInput = req.body.data;
        const dataInicio = new Date(dataInput);
        dataInicio.setUTCHours(0,0,0,0);
        const dataFim = new Date(dataInput);
        dataFim.setUTCHours(23,59,59,999);

        // 1. Pegar o dia da semana para o limite
        const diasSemana = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
        const nomeDia = diasSemana[new Date(dataInput).getUTCDay()];

        // 2. Buscar o limite na coleção limite_atendimento
        const regra = await db.collection('limite_atendimento').findOne({ 
            terapia: "Apometria", 
            dia_semana: nomeDia 
        });
        const limiteMax = regra ? parseInt(regra.qtos_atendimentos) : 0;

        // 3. Contar quantas solicitações já existem para este dia específico
        const totalExistente = await Solicitacao.countDocuments({ 
            data_pedido: { $gte: dataInicio, $lte: dataFim } 
        });

        const posicaoAtual = totalExistente + 1; // A posição desta pessoa
        let statusFinal = "Aprovado";
        let msgExtra = "Confirmado";

        if (posicaoAtual > limiteMax) {
            statusFinal = "Pendente";
            msgExtra = "Lista de Espera";
        }

        const novaSolicitacao = new Solicitacao({
            data_pedido: dataInput,
            cpf_assistido: req.body.cpf_assistido,
            nome_assistido: req.body.nome,
            status: statusFinal,
            observacoes: `Senha: ${posicaoAtual}/${limiteMax} - ${req.body.queixa}`
        });

        await novaSolicitacao.save();

        // Redireciona com os dados para o SweetAlert
        res.redirect(`/solicitacao_atendimento?sucesso=true&posicao=${posicaoAtual}&limite=${limiteMax}&status=${statusFinal}`);
    } catch (error) {
        res.status(500).send("Erro: " + error.message);
    }
});
// --- OUTRAS ROTAS ---
app.get('/assistido/novo', (req, res) => res.render('cadastro_assistidos'));

app.post('/atendimento/novo', async (req, res) => {
    try {
        const novoAtendimento = new Atendimento({ ...req.body, data: new Date() });
        await novoAtendimento.save();
        res.redirect('/');
    } catch (err) {
        res.status(500).send("Erro ao salvar atendimento");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor pronto na porta http://localhost:${PORT}`));