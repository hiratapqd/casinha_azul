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
    .then(() => console.log("✅ Conectado ao MongoDB Atlas"))
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

// --- ROTA PRINCIPAL (DASHBOARD) ---
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

// --- ROTA DE CADASTRO DE MÉDIUNS ---
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

app.get('/mediun/novo', (req, res) => {
    res.render('cadastro_mediuns');
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
app.listen(PORT, () => console.log(`🚀 Servidor pronto na porta ${PORT}`));