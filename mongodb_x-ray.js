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
    .then(() => console.log("✅ Conectado ao MongoDB Atlas 18:34 - Versão Estável"))
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

// ROTA DE DIAGNÓSTICO - Acesse localhost:3000/teste-dados
app.get('/teste-dados', async (req, res) => {
    try {
        // Busca o último voluntário cadastrado
        const voluntario = await Voluntario.findOne().sort({ _id: -1 });

        if (!voluntario) {
            return res.send("Nenhum voluntário encontrado no banco.");
        }

        // Retorna o JSON puro para verificarmos os nomes das chaves
        res.json({
            mensagem: "Verifique se a chave 'passe' existe dentro de 'disponibilidade'",
            estrutura_no_banco: voluntario
        });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor pronto na porta ${PORT}`));