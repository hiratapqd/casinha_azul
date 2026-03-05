const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://casinhaazul_db_user:w05yl31aajDQa3Bz@casinhaazulclr.yarm4jv.mongodb.net/?appName=casinhaazulclr";
const client = new MongoClient(uri);

async function listarTerapiasVoluntarios() {
    try {
        await client.connect();
        const db = client.db("casinha_azul");
        
        // Buscamos todos os voluntários na collection definida no seu schema 
        const voluntarios = await db.collection('Voluntarios').find({}).toArray();

        console.log("--- RELAÇÃO DE VOLUNTÁRIOS E TERAPIAS ---");

        voluntarios.forEach(v => {
            // Se a disponibilidade existir, vamos extrair o que vem depois do ":"
            let terapiasEncontradas = [];
            
            if (v.disponibilidade) {
                // Regex para capturar tudo que está entre ":" e ";" ou final da linha
                const regex = /:\s*([^;]+)/g;
                let match;
                
                while ((match = regex.exec(v.disponibilidade)) !== null) {
                    terapiasEncontradas.push(match[1].trim());
                }
            }

            // Remove duplicatas (caso ele faça Apometria em dois dias diferentes)
            const terapiasUnicas = [...new Set(terapiasEncontradas)];

            console.log(`Nome: ${v.nome}`);
            console.log(`Terapias: ${terapiasUnicas.length > 0 ? terapiasUnicas.join(", ") : "Não informada"}`);
            console.log('---------------------------------------');
        });

    } catch (err) {
        console.error("Erro ao listar dados:", err);
    } finally {
        await client.close();
    }
}

listarTerapiasVoluntarios();