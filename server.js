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
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    // Cria uma variável com a data e hora do momento da conexão
    const agora = new Date().toLocaleString('pt-BR');
    console.log(`✅ [${agora}] Conectado ao MongoDB Atlas`);
  })
  .catch(err => {
    const agora = new Date().toLocaleString('pt-BR');
    console.log(`❌ [${agora}] Erro ao conectar ao MongoDB:`, err);
  });

// Middleware Global
/* app.use(async (req, res, next) => {
    try {
        const db = mongoose.connection.db;
        if (!db) { res.locals.terapias = []; return next(); }
        const terapiasAtivas = await db.collection("terapias").find({ ativa: true }).sort({ ordem: 1 }).toArray();
        res.locals.terapias = terapiasAtivas;
        next();
    } catch (err) {
        next();
    }
}); */

// Middleware Global - server.js
/* app.use(async (req, res, next) => {
    try {
        const db = mongoose.connection.db;
        if (!db) { 
            res.locals.terapias = []; 
            return next(); 
        }
        // Busca as terapias para o dropdown do menu
        const terapiasAtivas = await db.collection("terapias").find({ ativa: true }).sort({ ordem: 1 }).toArray();
        res.locals.terapias = terapiasAtivas;
        next();
    } catch (err) {
        console.error("Erro no Menu:", err);
        res.locals.terapias = [];
        next();
    }
}); */
app.use(async (req, res, next) => {
    try {
        const db = mongoose.connection.db;
        // Tenta buscar no banco, se falhar ou estiver vazio, usa lista padrão
        let terapiasAtivas = await db.collection("terapias").find({ ativa: true }).sort({ ordem: 1 }).toArray();
        
        if (!terapiasAtivas || terapiasAtivas.length === 0) {
            terapiasAtivas = [
                { nome: "Apometria", slug: "apometrico" },
                { nome: "Reiki", slug: "reiki" },
                { nome: "Aurículo", slug: "auriculo" },
                { nome: "Homeopatia", slug: "homeopatia" }
            ];
        }
        res.locals.terapias = terapiasAtivas;
        next();
    } catch (err) {
        res.locals.terapias = [];
        next();
    }
});



// --- ROTA DE FORMULARIOS ---
app.get('/cadastro', (req, res) => res.render('cadastro_assistidos'));

/* app.get('/', async (req, res) => {
    try {
        const hojeInicio = new Date();
        hojeInicio.setHours(0, 0, 0, 0);
        const hojeFim = new Date();
        hojeFim.setHours(23, 59, 59, 999);

        const totalAtendimentosHoje = await Atendimento.countDocuments({
            data: { $gte: hojeInicio, $lte: hojeFim }
        });

        const voluntariosDB = await Voluntario.find({ esta_ativo: "Sim" }).lean();
        
        // Garante sábado como 'sab'
        const diasRef = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
        const hojeAbrev = diasRef[new Date().getDay()];

        const mapa = {
            "Apometria": ["apometria"], "Reiki": ["reiki"], "Aurículo": ["auriculo"],
            "Mãos sem Fronteiras": ["maos"], "Homeopático": ["homeopatia"],
            "Passe": ["passe"], "Cantina": ["cantina"], "Mesa": ["mesa"]
        };

        const contagemPorTipo = {};
        Object.keys(mapa).forEach(l => contagemPorTipo[l] = 0);
        const escala_hoje = [];

        voluntariosDB.forEach(v => {
            const disp = v.disponibilidade || {};

            for (const [label, chaves] of Object.entries(mapa)) {
                const dados = disp[chaves[0]];
                
                // Se o campo existe, ele conta para a Equipe Ativa (mesmo se o dia não for hoje)
                if (dados) {
                    contagemPorTipo[label]++;

                    // Agora vamos ver se ele entra na escala de HOJE
                    let lista = Array.isArray(dados) ? dados : [dados];
                    let listaLimpa = lista.map(d => 
                        String(d).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
                    );
                    if (listaLimpa.some(dia => dia === hojeAbrev || dia.includes(hojeAbrev))) {
                        escala_hoje.push({ nome: v.nome, tipo: label });
                    }

                    if (listaLimpa.includes(hojeAbrev)) {
                        escala_hoje.push({ nome: v.nome, tipo: label });
                    }
                }
            }
        });

        res.render('index', {
            resumo: {
                hoje: totalAtendimentosHoje,
                taxaAbandono: 33.3, 
                apometriaUnica: 5,
                voluntariosPorTipo: contagemPorTipo,
                totalVoluntarios: voluntariosDB.length
            },
            escala_hoje
        });
    } catch (err) {
        console.error("❌ Erro Dashboard:", err);
        res.status(500).send("Erro interno.");
    }
}); */

app.get('/', async (req, res) => {
    try {
        const hojeInicio = new Date();
        hojeInicio.setHours(0, 0, 0, 0);
        const hojeFim = new Date();
        hojeFim.setHours(23, 59, 59, 999);

        // 1. Dados simples (Contagem de atendimentos)
        const totalAtendimentosHoje = await Atendimento.countDocuments({
            data: { $gte: hojeInicio, $lte: hojeFim }
        });

        // 2. Buscar voluntários ativos (ou que não estão marcados como "Não")
        const voluntariosDB = await Voluntario.find({ esta_ativo: { $ne: "Não" } }).lean();

        // 3. MAPA DE CATEGORIAS
        const mapaGeral = {
            "Apometria": ["apometria"],
            "Reiki": ["reiki"],
            "Aurículo": ["auriculo"],
            "Mãos sem Fronteiras": ["maos"],
            "Homeopático": ["homeopatia", "homeopatico"],
            "Passe": ["passe"],
            "Cantina": ["cantina"],
            "Mesa": ["mesa"]
        };

        // --- FUNÇÃO 1: PROCESSAR EQUIPE ATIVA (CORRIGIDA) ---
        const calcularEquipeAtiva = (voluntarios, mapa) => {
            const contagemResumo = {};
            Object.keys(mapa).forEach(label => {
                const chaves = mapa[label];
                const encontrados = voluntarios.filter(v => {
                    const disp = v.disponibilidade || {};
                    return chaves.some(chave => {
                        const campo = disp[chave];
                        // Só conta se houver dias marcados (array > 0 ou string preenchida)
                        return (Array.isArray(campo) && campo.length > 0) || 
                               (typeof campo === 'string' && campo.trim() !== "");
                    });
                });
                contagemResumo[label] = encontrados.length;
            });
            return contagemResumo;
        };

        // --- FUNÇÃO 2: PROCESSAR ESCALA DO DIA ---
        const calcularEscalaHoje = (voluntarios, mapa) => {
            const diasRef = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
            const hojeAbrev = diasRef[new Date().getDay()];
            const escala = [];

            voluntarios.forEach(v => {
                const disp = v.disponibilidade || {};
                Object.entries(mapa).forEach(([label, chaves]) => {
                    let escaladoNestaCategoria = false;
                    chaves.forEach(chave => {
                        const dados = disp[chave];
                        if (!dados) return;

                        let lista = Array.isArray(dados) ? dados : [dados];
                        let listaLimpa = lista.map(d => 
                            String(d).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
                        );

                        if (listaLimpa.includes(hojeAbrev)) {
                            escaladoNestaCategoria = true;
                        }
                    });

                    if (escaladoNestaCategoria) {
                        escala.push({ nome: v.nome, tipo: label });
                    }
                });
            });
            return escala;
        };

        // 4. EXECUTAR AS LÓGICAS
        const voluntariosPorTipo = calcularEquipeAtiva(voluntariosDB, mapaGeral);
        const escala_hoje = calcularEscalaHoje(voluntariosDB, mapaGeral);

        // 5. RENDERIZAR
        res.render('index', {
            resumo: {
                hoje: totalAtendimentosHoje,
                taxaAbandono: 33.3, 
                apometriaUnica: 5,
                voluntariosPorTipo,
                totalVoluntarios: voluntariosDB.length
            },
            escala_hoje
        });

    } catch (err) {
        console.error("❌ Erro no Dashboard:", err);
        res.status(500).send("Erro ao carregar o painel.");
    }
});

app.get('/solicitacao_atendimento', (req, res) => res.render('solicitacao_atendimento'));
app.get('/cadastro_mediuns', (req, res) => {res.render('cadastro_mediuns');});
app.get('/atendimento/apometrico', (req, res) => {res.render('atendimento/apometrico', { atendimentos: [] });});
app.get('/atendimento/reiki', async (req, res) => {res.render('atendimento/reiki');});

/* app.get('/relatorios/todos-assistidos', async (req, res) => {
    try {
        // Busca todos os assistidos e ordena por nome
        const assistidos = await Assistido.find().sort({ nome: 1 }).lean();
        
        res.render('relatorios/relatorio_assistidos', { assistidos });
    } catch (err) {
        console.error("Erro ao gerar relatório de assistidos:", err);
        res.status(500).send("Erro ao carregar relatório.");
    }
});
app.get('/atendimento/auriculo', (req, res) => res.render('atendimento/auriculo'));
app.get('/atendimento/maos_sem_fronteiras', (req, res) => res.render('atendimento/maos_sem_fronteiras'));
app.get('/atendimento/homeopatico', (req, res) => res.render('atendimento/homeopatico'));
app.get('/cadastro_mediuns', (req, res) => res.render('cadastro_mediuns')); 
app.get('/atendimento/passe', (req, res) => res.render('atendimento/passe'));
app.get('/api/historico/:tipo/:cpf', async (req, res) => {
  try {
    const { tipo, cpf } = req.params;

    // 1) Busca histórico
    const historico = await Atendimento.find({
      cpf_assistido: cpf,
      tipo: tipo
    })
      .sort({ data: -1 })
      .limit(12)
      .lean();

    // 2) Busca assistido (SEM derrubar a rota se falhar)
    let assistido = null;
    try {
      const db = mongoose.connection.db;
      const doc = await db.collection('assistidos').findOne({ _id: cpf }); // sem projection
      if (doc) {
        assistido = { cpf, nome: doc.nome || "" };
      }
    } catch (e) {
      console.error("⚠️ Falha ao buscar assistido:", e);
      // continua mesmo assim
    }

    res.json({ assistido, historico });
  } catch (err) {
    console.error("❌ Erro /api/historico:", err);
    res.status(500).json({ erro: err.message || "Erro ao buscar histórico" });
  }
}); */

app.get('/relatorios/todos-assistidos', async (req, res) => {
    try {
        const db = mongoose.connection.db;

        const assistidosComTratamentos = await db.collection('assistidos').aggregate([
            { $sort: { nome: 1 } },
            {
                $lookup: {
                    from: "atendimento", // Nome da sua coleção de atendimentos
                    localField: "_id",    // CPF do assistido
                    foreignField: "cpf_assistido",
                    as: "historico"
                }
            },
            {
                $project: {
                    nome: 1,
                    cpf: "$_id",
                    telefone: 1,
                    email: 1,
                    // Cria uma lista de tipos únicos de tratamento realizados
                    tratamentos: { $setUnion: ["$historico.tipo"] }
                }
            }
        ]).toArray();

        res.render('relatorios/relatorio_assistidos', { assistidos: assistidosComTratamentos });
    } catch (err) {
        console.error("Erro ao gerar relatório de assistidos:", err);
        res.status(500).send("Erro ao carregar relatório.");
    }
});

//ROTA PARA RELATÓRIO DE ABANDONO - APOMETRIA
app.get('/relatorios/apometria-inativos', async (req, res) => {
  try {
    const db = mongoose.connection.db;

    const agora = new Date();
    const limite30 = new Date(agora); limite30.setDate(limite30.getDate() - 30);
    const limite60 = new Date(agora); limite60.setDate(limite60.getDate() - 60);
    const limite90 = new Date(agora); limite90.setDate(limite90.getDate() - 90);

    // Pipeline base: por CPF, pega:
    // - ultimaData (qualquer tipo)
    // - teveApometria (se existe pelo menos 1 apometrico)
    const base = await db.collection('atendimento').aggregate([
      {
        $group: {
          _id: "$cpf_assistido",
          ultimaData: { $max: "$data" },
          teveApometria: {
            $max: {
              $cond: [{ $eq: ["$tipo", "apometrico"] }, 1, 0]
            }
          }
        }
      },
      // precisa ter apometria em algum momento
      { $match: { teveApometria: 1 } },

      // traz dados do assistido (no seu caso assistidos._id = cpf)
      {
        $lookup: {
          from: "assistidos",
          localField: "_id",
          foreignField: "_id",
          as: "assistido"
        }
      },
      { $unwind: { path: "$assistido", preserveNullAndEmptyArrays: true } },

      {
        $project: {
          _id: 0,
          cpf: "$_id",
          nome: { $ifNull: ["$assistido.nome", ""] },
          telefone: { $ifNull: ["$assistido.telefone", ""] },
          email: { $ifNull: ["$assistido.email", ""] },
          ultimaData: 1
        }
      }
    ]).toArray();

    // filtra em memória por 30/60/90 (simples e rápido para volumes pequenos/médios)
    const lista30 = base.filter(x => x.ultimaData && new Date(x.ultimaData) < limite30);
    const lista60 = base.filter(x => x.ultimaData && new Date(x.ultimaData) < limite60);
    const lista90 = base.filter(x => x.ultimaData && new Date(x.ultimaData) < limite90);

    // padrão: mostra a lista de 60 dias
    res.render('relatorios/apometria_inativos', {
      counts: { d30: lista30.length, d60: lista60.length, d90: lista90.length },
      listas: { d30: lista30, d60: lista60, d90: lista90 }
    });

  } catch (err) {
    console.error("Erro relatório apometria-inativos:", err);
    res.status(500).send("Erro ao gerar relatório.");
  }
});

//ROTA PARA RELATÓRIO DE ATENDIMENTOS DE HOJE (TODOS TIPOS) - COM FILTRO POR TERAPIA E CONTAGEM PARA OS BOTÕES
app.get('/relatorios/atendimentos-hoje', async (req, res) => {
  try {
    const db = mongoose.connection.db;

    // HOJE em UTC (combina com o que você já usou nos cards)
    const inicio = new Date();
    inicio.setUTCHours(0, 0, 0, 0);

    const fim = new Date(inicio);
    fim.setUTCDate(inicio.getUTCDate() + 1);

    // terapias para os botões (se você já usa a collection 'terapias', aproveitamos)
    const terapiasAtivas = await db.collection('terapias')
      .find({ ativa: true })
      .sort({ ordem: 1, nome: 1 })
      .toArray();

    // atendimentos de hoje (todos os tipos)
    const atendimentos = await db.collection('atendimento')
      .find({ data: { $gte: inicio, $lt: fim } })
      .sort({ data: -1 })
      .toArray();

    // total por tipo (para mostrar no botão)
    const contagemPorTipo = await db.collection('atendimento').aggregate([
      { $match: { data: { $gte: inicio, $lt: fim } } },
      { $group: { _id: "$tipo", total: { $sum: 1 } } }
    ]).toArray();

    const counts = {};
    contagemPorTipo.forEach(x => { counts[x._id] = x.total; });

    res.render('relatorios/atendimentos_hoje', {
      atendimentos,
      terapias: terapiasAtivas, // para montar os botões
      counts
    });

  } catch (err) {
    console.error("Erro relatório atendimentos-hoje:", err);
    res.status(500).send("Erro ao gerar relatório.");
  }
});
app.get('/voluntarios/escala', async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const { dia, terapia } = req.query;
        let voluntariosFiltrados = [];

        if (dia && terapia) {
            // A consulta usa a notação de ponto para acessar o subcampo dinâmico

            const query = {};
            query[`disponibilidade.${terapia}`] = dia;

            voluntariosFiltrados = await db.collection('voluntarios')
                .find(query)
                .sort({ nome: 1 })
                .toArray();
        }

        res.render('visualizar_voluntarios', { 
            voluntarios: voluntariosFiltrados, 
            filtros: { dia, terapia } 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao buscar escala.");
    }
});

// --- ROTA DE CADASTRO  ---

// ROTA DE CADASTRO DE MÉDIUNS/VOLUNTÁRIOS
// --- ROTA DE CADASTRO DE MÉDIUNS ---
app.post('/mediun/novo', async (req, res) => {
    try {
        const { cpf, forceUpdate } = req.body;
        const voluntarioExistente = await Voluntario.findOne({ _id: cpf });

        const formatarDias = (campo) => {
            if (!campo) return [];
            return Array.isArray(campo) ? campo : [campo];
        };

        const dadosVoluntario = {
            _id: cpf,
            nome: req.body.nome,
            cpf: req.body.cpf,
            telefone: req.body.telefone,
            email: req.body.email,
            mediunidade: req.body.mediunidade,
            esta_ativo: req.body.esta_ativo || "Sim",
            disponibilidade: {
                apometria: formatarDias(req.body.voluntario_apometria_dias),
                reiki: formatarDias(req.body.voluntario_reiki_dias),
                auriculo: formatarDias(req.body.voluntario_auriculo_dias),
                maos: formatarDias(req.body.voluntario_maos_dias),
                homeopatia: formatarDias(req.body.voluntario_homeopatia_dias),
                cantina: formatarDias(req.body.voluntario_cantina_dias),
                passe: formatarDias(req.body.voluntario_passe_dias), // Agora salva o passe!
                mesa: formatarDias(req.body.voluntario_mesa_dias)
            }
        };

        if (voluntarioExistente) {
            // Se já existe e estamos atualizando, NÃO mexemos na data de cadastro original
            await Voluntario.updateOne({ _id: cpf }, dadosVoluntario);
            res.json({ status: 'sucesso', acao: 'atualizado' });
        } else {
            // Se é NOVO, adicionamos a data de cadastro agora
            const novoVoluntario = new Voluntario({
                ...dadosVoluntario,
                data_cadastro_voluntario: new Date() // Grava data e hora atual
            });
            await novoVoluntario.save();
            res.json({ status: 'sucesso', acao: 'criado' });
        }
    } catch (err) {
        console.error("Erro ao salvar voluntário:", err);
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

const tiposAtendimento = ['reiki', 'passe', 'homeopatico', 'maos_sem_fronteiras'];

tiposAtendimento.forEach(tipo => {
    app.post(`/atendimento/${tipo}`, async (req, res) => {
        try {
            // Garante que o campo 'tipo' seja gravado corretamente
            const dados = { ...req.body, tipo: tipo, data: new Date() };
            const novoAtendimento = new Atendimento(dados);
            await novoAtendimento.save();
            res.redirect(`/atendimento/${tipo}?sucesso=true`);
        } catch (error) {
            console.error(`Erro ao salvar ${tipo}:`, error);
            res.status(500).send("Erro ao salvar: " + error.message);
        }
    });
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