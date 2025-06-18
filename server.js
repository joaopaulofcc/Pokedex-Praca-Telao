/*
* ====================================================================================
* SERVIDOR DA POKÉDEX COMUNITÁRIA (server.js)
* ====================================================================================
*
* Olá! Bem-vindo(a) ao cérebro do nosso projeto!
*
* Este arquivo cria um programa que roda em um servidor (como o Render.com). Ele não
* é a página que as pessoas veem, mas sim o maestro que organiza toda a
* operação por trás das cortinas.
*
* Suas principais responsabilidades são:
*
* 1.  FORNECER O SITE: Ele age como um servidor web, entregando os arquivos da
* pasta 'public' (o HTML, CSS e o JavaScript da tela) para o navegador de
* quem acessa o telão.
*
* 2.  GUARDAR O PROGRESSO: Ele usa um arquivo chamado `pokedex-db.json` como um
* pequeno banco de dados. É aqui que o progresso de todos os Pokémon
* capturados pela comunidade fica salvo de forma permanente.
*
* 3.  COMUNICAR-SE EM TEMPO REAL: Ele cria um "túnel" de comunicação direto e
* instantâneo (usando a tecnologia WebSocket) com cada tela que está com a
* página da Pokédex aberta.
*
* 4.  RECEBER NOVAS CAPTURAS: Ele tem um endereço especial (um "webhook" na rota
* '/capture') que fica esperando o sistema do chatbot (n8n) avisar sobre
* uma nova captura de Pokémon.
*
* 5.  OFERECER FERRAMENTAS DE ADMIN: Ele possui endereços secretos (rotas '/admin/...')
* que permitem que um administrador, com a senha correta, zere ou complete
* a Pokédex para todos.
*
* O fluxo de uma captura funciona assim:
* Chatbot -> Servidor (recebe no /capture) -> Salva no arquivo -> Anuncia para todas as telas (via WebSocket)
*
*/

// --- 1. IMPORTAÇÃO DAS FERRAMENTAS (BIBLIOTECAS) ---

// 'express' é uma ferramenta que facilita enormemente a criação de servidores web em Node.js.
const express = require('express');
// 'http' é um módulo essencial do Node.js, necessário para criar o servidor que o Express e o WebSocket usarão.
const http = require('http');
// 'path' nos ajuda a trabalhar com caminhos de arquivos e pastas de um jeito que funciona em qualquer sistema (Windows, Mac, etc.).
const path = require('path');
// 'ws' (WebSocket) é a biblioteca que nos dá o poder de criar a comunicação em tempo real entre o servidor e os navegadores.
const WebSocket = require('ws');
// 'fs' significa "File System". É a ferramenta do Node.js para interagir com os arquivos do computador, como ler e escrever.
const fs = require('fs');


// --- 2. DEFINIÇÃO DOS SEGREDOS ---

// Segredo para as funções de administrador. LIDO DA VARIÁVEL DE AMBIENTE.
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'senha-local-para-testes';

// Segredo para validar requisições do n8n. SÓ É ATIVADO SE A VARIÁVEL DE AMBIENTE EXISTIR.
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;


// --- 3. CONFIGURAÇÃO INICIAL E BANCO DE DADOS ---
// Aqui, damos início à nossa aplicação de servidor. A variável 'app' é o nosso servidor Express.
const app = express();
// Esta linha "ensina" nosso servidor a entender o formato de dados JSON que vem no corpo das requisições.
app.use(express.json());

// Este é o caminho completo para o nosso arquivo que funciona como banco de dados.
const DB_PATH = path.join(__dirname, 'pokedex-db.json');
// Esta variável (array) vai guardar na memória do servidor a lista de IDs dos Pokémon que já foram capturados.
let pokedexState = [];

/**
 * Função para carregar os dados do arquivo `pokedex-db.json` para a memória do servidor.
 * Ela é executada assim que o servidor liga.
 */
function loadDatabase() {
    // `try...catch` é um bloco de segurança. Ele tenta executar o código em 'try', e se algum erro acontecer, ele executa o código em 'catch' sem quebrar o programa.
    try {
        // Verifica se o arquivo de banco de dados realmente existe no caminho especificado.
        if (fs.existsSync(DB_PATH)) {
            // Se o arquivo existe, lê todo o seu conteúdo como texto.
            const data = fs.readFileSync(DB_PATH, 'utf8');
            // Transforma o texto (que está em formato JSON) em um objeto/array que o JavaScript consegue entender.
            pokedexState = JSON.parse(data).captured || [];
            // Imprime uma mensagem no console para o desenvolvedor saber que o progresso foi carregado.
            console.log(`Banco de dados carregado. ${pokedexState.length} Pokémon já capturados.`);
        } else {
            // Se o arquivo não existe, cria um novo e vazio.
            saveDatabase();
            console.log('Arquivo de banco de dados não encontrado. Um novo foi criado.');
        }
    } catch (e) {
        // Se ocorrer um erro durante a leitura ou interpretação do arquivo, exibe o erro no console.
        console.error('Erro ao carregar o banco de dados:', e);
        // E por segurança, começa com uma lista de capturados vazia.
        pokedexState = [];
    }
}

/**
 * Função para salvar o estado atual da `pokedexState` (da memória) de volta para o arquivo `pokedex-db.json`.
 * Isso garante que o progresso fique guardado permanentemente.
 */
function saveDatabase() {
    try {
        // Converte nosso array de IDs de volta para um texto em formato JSON. O `null, 2` formata o texto para que fique organizado e fácil de um humano ler.
        const dataToSave = JSON.stringify({ captured: pokedexState }, null, 2);
        // Escreve o texto gerado para dentro do nosso arquivo, substituindo o conteúdo antigo.
        fs.writeFileSync(DB_PATH, dataToSave, 'utf8');
    } catch (e) {
        // Se um erro acontecer ao tentar salvar, ele é mostrado no console.
        console.error('Erro ao salvar no banco de dados:', e);
    }
}


// --- 4. SERVINDO ARQUIVOS E CONFIGURANDO WEBSOCKET ---
// Esta linha importante diz ao servidor que a pasta chamada 'public' contém todos os arquivos estáticos do nosso site (HTML, CSS, JavaScript da tela, etc.).
app.use(express.static(path.join(__dirname, 'public')));
// Cria o servidor HTTP principal usando as configurações do Express.
const server = http.createServer(app);
// Anexa um servidor WebSocket ao nosso servidor HTTP. Eles compartilharão o mesmo endereço e porta.
const wss = new WebSocket.Server({ server });

// Este bloco de código é um "ouvinte de evento". Ele roda toda vez que um novo navegador (tela) estabelece uma conexão WebSocket.
// 'ws' representa a conexão individual com aquela tela específica.
wss.on('connection', (ws) => {
    // Imprime uma mensagem no console do servidor para o desenvolvedor.
    console.log('Tela da Pokédex conectou-se ao WebSocket!');
    // Assim que uma tela conecta, enviamos a ela o estado completo e atual da Pokédex.
    ws.send(JSON.stringify({ type: 'initial_state', captured: pokedexState }));
    // Fica ouvindo por mensagens que a tela possa enviar para o servidor.
    ws.on('message', (message) => {
        try {
            // Usado para um mecanismo de "ping-pong" que ajuda a manter a conexão ativa.
            if (JSON.parse(message).type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong' }));
            }
        } catch (e) {}
    });
    // Roda quando a conexão com esta tela é encerrada (ex: usuário fechou a aba).
    ws.on('close', () => {
        console.log('Tela da Pokédex desconectou-se.');
    });
});

/**
 * Esta função é como um "megafone". Ela envia uma mensagem para TODAS as telas conectadas.
 * @param {object} data - O objeto JavaScript com os dados a serem enviados.
 */
function broadcast(data) {
    // `wss.clients` é a lista de todas as conexões ativas.
    wss.clients.forEach((client) => {
        // Verifica se a conexão do cliente está realmente aberta.
        if (client.readyState === WebSocket.OPEN) {
            // Envia os dados, convertendo para texto JSON antes.
            client.send(JSON.stringify(data));
        }
    });
}


// --- 5. ROTAS DA APLICAÇÃO (ENDPOINTS) ---

/**
 * Rota que recebe as capturas do n8n.
 * AGORA PROTEGIDA POR SEGREDO.
 */
app.post('/capture', (req, res) => {
    // Bloco de segurança: verifica o segredo do n8n
    if (N8N_WEBHOOK_SECRET) {
        const receivedSecret = req.headers['x-webhook-secret'];
        if (receivedSecret !== N8N_WEBHOOK_SECRET) {
            console.warn('Requisição em /capture bloqueada: segredo inválido.');
            return res.status(403).send('Acesso negado.');
        }
    }

    // Lógica de captura (continua igual)
    console.log('Dados recebidos do n8n:', req.body);
    const { id, name } = req.body;
    if (!id || !name) {
        return res.status(400).send('Dados incompletos.');
    }
    const pokemonId = parseInt(id, 10);
    const isNewCapture = !pokedexState.includes(pokemonId);

    if (isNewCapture) {
        pokedexState.push(pokemonId);
        saveDatabase();
        broadcast({ id: pokemonId, name, action: 'new_capture' });
    } else {
        broadcast({ id: pokemonId, name, action: 'duplicate_capture' });
    }
    res.status(200).send('Dados recebidos.');
});

/**
 * Rotas de Administração, protegidas por senha.
 */
app.post('/admin/verify', (req, res) => {
    if (req.body.secret === ADMIN_SECRET) {
        res.status(200).send('Senha correta.');
    } else {
        res.status(403).send('Acesso negado.');
    }
});

app.post('/admin/reset', (req, res) => {
    if (req.body.secret !== ADMIN_SECRET) {
        return res.status(403).send('Acesso negado.');
    }
    pokedexState = [];
    saveDatabase();
    broadcast({ type: 'initial_state', captured: pokedexState });
    res.status(200).send('Pokédex zerada com sucesso!');
});

app.post('/admin/complete', (req, res) => {
    if (req.body.secret !== ADMIN_SECRET) {
        return res.status(403).send('Acesso negado.');
    }
    pokedexState = Array.from({ length: 151 }, (_, i) => i + 1);
    saveDatabase();
    broadcast({ type: 'initial_state', captured: pokedexState });
    res.status(200).send('Pokédex completada com sucesso!');
});


// --- 6. INICIALIZAÇÃO DO SERVIDOR ---
// Define a porta em que o servidor irá rodar.
const PORT = process.env.PORT || 3000;

// O comando que efetivamente "liga" o servidor para que ele comece a ouvir por conexões.
server.listen(PORT, () => {
    // Assim que o servidor está no ar, a primeira coisa que ele faz é carregar o progresso salvo.
    loadDatabase();
    // Exibe mensagens úteis no console para o desenvolvedor.
    console.log(`Servidor iniciado e ouvindo na porta ${PORT}.`);
});