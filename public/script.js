/*
* ===================================================================================
* SCRIPT DO TELÃO INTERATIVO - POKÉDEX COMUNITÁRIA UNILAVRAS
* ===================================================================================
*
* Olá! Este arquivo é o "cérebro" da PÁGINA WEB. Ele é o código que roda
* diretamente no navegador de quem está assistindo ao telão e é responsável
* por toda a interatividade e pelas animações que você vê.
*
* Suas principais responsabilidades são:
*
* 1.  DESENHAR A GRADE INICIAL: Ele cria os 151 cards de Pokémon na tela,
* mostrando-os inicialmente como silhuetas escuras.
*
* 2.  CONECTAR-SE AO SERVIDOR: Ele abre um "rádio" de comunicação em tempo real
* (usando WebSocket) para ouvir os "anúncios" que o servidor (`server.js`) envia.
*
* 3.  SINCRONIZAR O ESTADO: Assim que se conecta, a primeira coisa que ele faz é
* receber uma mensagem do servidor com a lista de todos os Pokémon que já foram
* capturados. Ele usa essa lista para virar os cards corretos e deixar a
* grade atualizada.
*
* 4.  REAGIR AOS ANÚNCIOS: Ele fica constantemente "ouvindo". Quando o servidor
* anuncia uma nova captura, este script entra em ação para:
* - Disparar a animação de destaque no meio da tela.
* - Tocar o som característico daquele Pokémon.
* - Virar o card correspondente na grade para revelar a imagem colorida.
*
* 5.  GERENCIAR O PAINEL DE ADMINISTRAÇÃO: Ele controla o botão de engrenagem,
* que pede uma senha e, se a senha estiver correta, se comunica com o
* servidor para exibir os botões de teste (Zerar, Completar, etc.).
*
*/

// Espera a página HTML ser totalmente carregada antes de executar qualquer código.
// É uma boa prática para garantir que todos os elementos da tela já existam.
document.addEventListener('DOMContentLoaded', () => {

    // --- SEÇÃO 1: CONFIGURAÇÕES E VARIÁVEIS PRINCIPAIS ---

    // "Mapeamento" dos elementos HTML: aqui, pegamos todos os botões e áreas da tela
    // que vamos precisar manipular com o nosso JavaScript, dando um "apelido" para cada um.
    const grid = document.getElementById('pokedex-grid');
    const template = document.getElementById('card-template');
    const testControls = document.querySelector('.test-controls');
    const testNewButton = document.getElementById('test-new');
    const testDuplicateButton = document.getElementById('test-duplicate');
    const testResetButton = document.getElementById('test-reset');
    const testCompleteButton = document.getElementById('test-complete');
    const capturedCountElement = document.getElementById('captured-count');
    const totalCountElement = document.getElementById('total-count');
    const muteButton = document.getElementById('mute-button');
    const toggleTestButton = document.getElementById('toggle-test-mode');
    const completionBanner = document.getElementById('completion-banner');
    const closeBannerButton = document.getElementById('close-banner-button');
    const startOverlay = document.getElementById('start-overlay');
    const startButton = document.getElementById('start-button');
    const toggleScrollButton = document.getElementById('toggle-scroll-button');
    
    // Constantes do jogo: definem as regras básicas da nossa Pokédex.
    const totalPokemon = 151; // O total de Pokémon da primeira geração.

    // Variáveis de estado: guardam informações que mudam durante o uso.
    let capturedCount = 0; // Armazena quantos Pokémon já foram capturados.
    let isMuted = false;   // Controla se o som está ligado ou desligado.
    let isAutoScrollEnabled = false; // Controla se a rolagem automática está habilitada.
    let completionMusic;   // Guarda a música de vitória para podermos pará-la depois.
    let autoScrollTimeout = null; // Controla o timer da rolagem automática.
    let restartScrollTimeout = null; // Controla o timer para reiniciar o scroll.


    // --- SEÇÃO 2: INICIALIZAÇÃO E CONFIGURAÇÃO DOS BOTÕES ---

    /**
     * A função principal que dá o pontapé inicial em toda a aplicação na tela.
     */
    function initialize() {
        // Prepara a tela de início para aguardar a interação do usuário.
        setupStartScreen();
        
        // Prepara todos os botões da interface para serem clicáveis.
        setupMuteButton();
        setupAutoScrollToggleButton();
        setupTestModeToggleButton();
        setupCloseBannerButton();
        setupTestButtons();

        // Cria a grade de 151 Pokémon na tela, ainda como silhuetas.
        generateGrid();
        // Inicia o contador na tela mostrando "0 de 151".
        updateCounter();

        // Inicia a conexão em tempo real com o servidor.
        connectWebSocket();
        
        console.log(`Aplicação iniciada. Aguardando interação do usuário para iniciar a experiência completa.`);
    }

    /**
     * Configura a tela de início, que aguarda um clique para desbloquear
     * o áudio e iniciar a experiência interativa.
     */
    function setupStartScreen() {
        startButton.addEventListener('click', () => {
            // Toca um som silencioso para atender à política de áudio dos navegadores.
            const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
            silentAudio.play().catch(e => console.warn("Não foi possível pré-autorizar o áudio.", e));

            // Esconde a tela de início.
            startOverlay.style.opacity = '0';
            setTimeout(() => {
                startOverlay.style.display = 'none';
            }, 500); // Espera a animação de fade-out terminar.
            
            console.log("Experiência iniciada pelo usuário!");
        }, { once: true }); // O evento só precisa ser disparado uma vez.
    }
    
    /**
     * Configura o botão de Ligar/Desligar o som.
     */
    function setupMuteButton() {
        // Adiciona a classe 'unmuted' para mostrar o ícone de som ligado no início.
        muteButton.classList.add('unmuted');
        // Define o que acontece quando o botão é clicado.
        muteButton.addEventListener('click', () => {
            isMuted = !isMuted; // Inverte o estado (de ligado para desligado e vice-versa).
            // Troca as classes para o CSS mostrar o ícone correto (som ligado ou desligado).
            muteButton.classList.toggle('muted', isMuted);
            muteButton.classList.toggle('unmuted', !isMuted);
            console.log(`Som ${isMuted ? 'desativado' : 'ativado'}.`);
        });
    }

    /**
     * Configura o botão que liga/desliga a rolagem automática.
     */
    function setupAutoScrollToggleButton() {
        // Define o estado inicial do botão como desabilitado.
        toggleScrollButton.classList.add('disabled');

        toggleScrollButton.addEventListener('click', () => {
            // Inverte o estado da variável de controle.
            isAutoScrollEnabled = !isAutoScrollEnabled;
            // Atualiza a aparência do botão.
            toggleScrollButton.classList.toggle('enabled', isAutoScrollEnabled);
            toggleScrollButton.classList.toggle('disabled', !isAutoScrollEnabled);

            if (isAutoScrollEnabled) {
                console.log('Rolagem automática ativada.');
                startAutoScroll();
            } else {
                console.log('Rolagem automática desativada.');
                stopAutoScroll();
            }
        });
    }

    /**
     * Configura o botão (engrenagem ⚙️) que mostra os controles de teste.
     * Ele pede uma senha antes de liberar o acesso.
     */
    function setupTestModeToggleButton() {
        // Verifica se o botão realmente existe na página.
        if (toggleTestButton) {
            // Adiciona um "ouvinte de evento" para o clique no botão.
            toggleTestButton.addEventListener('click', () => {
                // Se o painel de teste já estiver visível, o clique serve para escondê-lo.
                if (testControls.style.display === 'block') {
                    testControls.style.display = 'none';
                    return; // Para a execução da função aqui.
                }

                // Se o painel estiver escondido, pede a senha de administrador.
                const secret = prompt('Digite a senha de administrador para ver as opções de teste:');

                // Se o administrador digitou uma senha (e não clicou em "cancelar")...
                if (secret) {
                    // ...usa a API `fetch` para enviar a senha para a rota de verificação no servidor.
                    fetch('/admin/verify', {
                        method: 'POST', // O método é POST para enviar dados no corpo.
                        headers: { 'Content-Type': 'application/json' }, // Avisa que estamos enviando dados em formato JSON.
                        body: JSON.stringify({ secret: secret }), // Converte nosso objeto com a senha para texto JSON.
                    })
                    .then(response => {
                        // A propriedade 'ok' do objeto de resposta é verdadeira se o status HTTP for de sucesso (como 200).
                        if (response.ok) {
                            // Se a senha estiver correta (servidor respondeu com sucesso), mostra o painel de testes.
                            testControls.style.display = 'block';
                        } else {
                            // Se a senha estiver errada (servidor respondeu com erro), avisa o usuário.
                            alert('Acesso negado. Senha incorreta.');
                        }
                    })
                    .catch(err => {
                        // Se houver um erro de rede, avisa no console e na tela.
                        console.error('Erro ao verificar a senha:', err);
                        alert('Erro de comunicação com o servidor.');
                    });
                }
            });
        }
    }

    /**
     * Configura o botão "Fechar" do banner de Pokédex completa.
     */
    function setupCloseBannerButton() {
        // Define o que acontece quando o botão de fechar o banner final é clicado.
        closeBannerButton.addEventListener('click', () => {
            // Esconde o banner e para a música de vitória.
            completionBanner.classList.add('hidden');
            document.body.classList.remove('pokedex-complete');
            if (completionMusic) {
                completionMusic.pause();
                completionMusic.currentTime = 0;
            }
        });
    }


    // --- SEÇÃO 3: LÓGICA DA POKÉDEX (GRADE E DADOS) ---

    /**
     * Gera a grade com todos os 151 Pokémon.
     * Ele usa um "molde" (template) do HTML para criar 151 cópias,
     * cada uma com o ID e a imagem de silhueta corretos.
     */
    function generateGrid() {
        for (let i = 1; i <= totalPokemon; i++) {
            // Clona o conteúdo do nosso molde de card.
            const clone = template.content.cloneNode(true);
            // Pega o elemento principal do card clonado.
            const card = clone.querySelector('.pokemon-card');
            // Define o ID do Pokémon no card (ex: data-id="25").
            card.dataset.id = i;
            // Define a imagem da silhueta.
            card.querySelector('.pokemon-silhouette').src = `https://gearoid.me/pokemon/images/artwork/${i}.png`;
            // Define o número do Pokémon (ex: #025).
            card.querySelector('.pokemon-id').textContent = `#${i.toString().padStart(3, '0')}`;
            // Adiciona o card pronto na grade da tela.
            grid.appendChild(card);
        }
    }
    
    /**
     * Atualiza o placar "Capturados: X de 151" na tela.
     */
    function updateCounter() {
        capturedCountElement.textContent = capturedCount;
        totalCountElement.textContent = totalPokemon;
    }


    // --- SEÇÃO 4: COMUNICAÇÃO EM TEMPO REAL (WEBSOCKET) ---

    /**
     * Inicia a conexão com o servidor do chatbot (via WebSocket).
     * É como ligar um "walkie-talkie" para ficar ouvindo as mensagens do servidor.
     */
    function connectWebSocket() {
        console.log('Iniciando conexão WebSocket...');
        
        // Descobre o endereço do servidor para se conectar.
        const host = window.location.host;
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'; // wss para https, ws para http.
        const wsUrl = `${protocol}://${host}`;

        const ws = new WebSocket(wsUrl);
        let pingInterval;

        // Roda quando a conexão é estabelecida com sucesso.
        ws.onopen = () => {
            console.log('✅ Conexão com o servidor estabelecida!');
            // Envia um "ping" a cada 25 segundos para avisar o servidor que ainda estamos aqui.
            pingInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'ping' }));
                }
            }, 25000);
        };

        // Roda toda vez que uma mensagem chega do servidor.
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data); // Tenta ler a mensagem.

                // Usa um 'switch' para decidir o que fazer com base no 'tipo' da mensagem.
                switch(data.type) {
                    // Se for um 'pong' (resposta ao nosso 'ping'), apenas ignora.
                    case 'pong':
                        break;
                    
                    // Se for o 'estado inicial', sincroniza a grade.
                    case 'initial_state':
                        console.log('Estado inicial recebido do servidor.', data.captured);
                        capturedCount = 0; // Zera o contador local.
                        document.querySelectorAll('.pokemon-card.captured').forEach(card => card.classList.remove('captured'));

                        // Para cada ID de Pokémon que o servidor enviou...
                        data.captured.forEach(id => {
                            const card = document.querySelector(`.pokemon-card[data-id='${id}']`);
                            if (card && !card.classList.contains('captured')) {
                                const pokemonName = POKEMON_NAMES[id - 1];
                                card.classList.add('captured'); // Vira o card.
                                // Preenche os dados do verso do card.
                                card.querySelector('.pokemon-img').src = `https://gearoid.me/pokemon/images/artwork/${id}.png`;
                                card.querySelector('.pokemon-name').textContent = pokemonName;
                                capturedCount++; // Incrementa o contador.
                            }
                        });
                        updateCounter(); // Atualiza o placar.

                        // Se a Pokédex já estiver completa, aciona a celebração.
                        if (capturedCount === totalPokemon) {
                            triggerPokedexCompletionCelebration();
                        }
                        break;
                    
                    // Se não for nenhum dos tipos acima, assume que é uma ação de captura.
                    default:
                        handlePokemonAction(data);
                        break;
                }

            } catch (e) {
                console.error('Erro ao processar dados do servidor:', e);
            }
        };

        // Roda se a conexão for fechada.
        ws.onclose = () => {
            console.warn('❌ Conexão com o servidor foi fechada.');
            clearInterval(pingInterval); // Para de enviar "pings".
        };

        // Roda se ocorrer um erro de conexão.
        ws.onerror = (error) => {
            console.error('🔥 Erro no WebSocket.', error);
            clearInterval(pingInterval);
        };
    }
    

    // --- SEÇÃO 5: EFEITOS VISUAIS E SONOROS ---
    
    /**
     * Toca o "grito" característico de um Pokémon.
     * @param {number} pokemonId - O ID do Pokémon para tocar o som.
     */
    function playPokemonCry(pokemonId) {
        if (isMuted) return; // Se o som estiver desligado, não faz nada.
        const audio = new Audio(`https://pokemoncries.com/cries-old/${pokemonId}.mp3`);
        audio.play().catch(error => {
            console.warn(`Áudio para o Pokémon ID ${pokemonId} não encontrado ou bloqueado.`, error);
        });
    }

    /**
     * Toca a música de vitória quando a Pokédex é completada.
     */
    function playCompletionMusic() {
        if (isMuted) return;
        const victoryUrl = 'https://eta.vgmtreasurechest.com/soundtracks/pokemon-game-boy-pok-mon-sound-complete-set-play-cd/vfywpihuos/1-01.%20Opening.mp3';
        completionMusic = new Audio(victoryUrl);
        completionMusic.play().catch(error => console.warn('Não foi possível tocar a música de vitória.', error));
        // Para a música após 10 segundos para não ficar repetindo.
        setTimeout(() => {
            if (completionMusic) {
                completionMusic.pause();
                completionMusic.currentTime = 0;
            }
        }, 10000);
    }
    
    /**
     * Cria e controla a animação de destaque que aparece no meio do telão.
     */
    function showHighlightAnimation(id, name, originalCard, bannerText) {
        // Pega a posição e tamanho do card original na grade.
        const rect = originalCard.getBoundingClientRect();
        
        // Cria os elementos HTML da animação dinamicamente.
        const highlightNode = document.createElement('div');
        highlightNode.className = 'pokemon-highlight';
        highlightNode.innerHTML = `<div class="card-back"><img src="https://gearoid.me/pokemon/images/artwork/${id}.png" class="pokemon-img" alt="${name}"></div>`;

        const bannerNode = document.createElement('div');
        bannerNode.className = 'highlight-banner';
        bannerNode.textContent = bannerText;

        // Posiciona o clone da animação exatamente sobre o card original.
        highlightNode.style.cssText = `width: ${rect.width}px; height: ${rect.height}px; top: ${rect.top}px; left: ${rect.left}px; transform: scale(1);`;
        
        // Adiciona os elementos de animação na página.
        document.body.appendChild(highlightNode);
        document.body.appendChild(bannerNode);

        // Animação de entrada: move o card para o centro e o aumenta.
        setTimeout(() => {
            const targetX = `calc(50vw - ${rect.width / 2}px - ${rect.left}px)`;
            const targetY = `calc(50vh - ${rect.height / 2}px - ${rect.top}px)`;
            const scale = 350 / rect.width;
            highlightNode.style.transform = `translate(${targetX}, ${targetY}) scale(${scale})`;
            bannerNode.style.top = '20px';
            bannerNode.style.opacity = '1';
        }, 50);

        // Animação do nome do Pokémon aparecendo.
        const nameNode = document.createElement('div');
        nameNode.className = 'pokemon-name-separate';
        nameNode.textContent = name;
        document.body.appendChild(nameNode);
        
        setTimeout(() => {
            nameNode.style.opacity = '1';
            nameNode.style.transform = 'translate(-50%, 0)';
        }, 500);

        // Animação de saída: move o card de volta para o lugar e o esconde.
        setTimeout(() => {
            highlightNode.style.transform = `translate(0, 0) scale(1)`;
            highlightNode.style.opacity = '0';
            bannerNode.style.top = '-150px';
            bannerNode.style.opacity = '0';
            nameNode.style.opacity = '0';
        }, 2500);

        // Limpeza: remove os elementos da animação da página após ela terminar.
        setTimeout(() => {
            highlightNode.remove();
            bannerNode.remove();
            nameNode.remove();
            // Reinicia a rolagem automática, se estiver habilitada.
            if (isAutoScrollEnabled) {
                startAutoScroll();
            }
        }, 3300);
    }

    /**
     * Inicia a grande celebração de Pokédex completa!
     */
    function triggerPokedexCompletionCelebration() {
        console.log('🎉 POKÉDEX COMPLETA! INICIANDO CELEBRAÇÃO! 🎉');
        playCompletionMusic();
        document.body.classList.add('pokedex-complete');
        completionBanner.classList.remove('hidden');
        // Faz uma "onda" de animação em todos os cards.
        document.querySelectorAll('.pokemon-card').forEach((card, index) => {
            setTimeout(() => { card.classList.add('wave-animate'); }, index * 15);
        });
        // Lança confetes!
        launchConfetti();
    }
    
    /**
     * Dispara o efeito de confetes na tela.
     */
    function launchConfetti() {
        if (typeof confetti !== 'function') return; // Verifica se a biblioteca de confete existe.
        const colors = ['#009DE0', '#FFFFFF', '#021D34']; // Cores personalizadas.
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: colors });
        setTimeout(() => {
            confetti({ particleCount: 150, angle: 60, spread: 55, origin: { x: 0 }, colors: colors });
            confetti({ particleCount: 150, angle: 120, spread: 55, origin: { x: 1 }, colors: colors });
        }, 400);
    }


    // --- SEÇÃO 6: MANIPULADOR DE EVENTOS PRINCIPAL ---

    /**
     * Recebe uma mensagem de captura do servidor e comanda as ações na tela.
     */
    function handlePokemonAction(data) {
        const targetCard = document.querySelector(`.pokemon-card[data-id='${data.id}']`);
        if (!targetCard) return;

        playPokemonCry(data.id);
        stopAutoScroll();

        // A decisão se a captura é 'nova' ou 'duplicada' vem pronta do servidor.
        const isNewCapture = data.action === 'new_capture';

        if (isNewCapture) {
            showHighlightAnimation(data.id, data.name, targetCard, 'Novo Pokémon Capturado!');
            
            // Verifica se o card já não foi revelado, para evitar recontagens se a mesma mensagem chegar duas vezes.
            if (!targetCard.classList.contains('captured')) {
                setTimeout(() => {
                    targetCard.querySelector('.pokemon-img').src = `https://gearoid.me/pokemon/images/artwork/${data.id}.png`;
                    targetCard.querySelector('.pokemon-name').textContent = data.name;
                    targetCard.classList.add('captured');
                    capturedCount++;
                    updateCounter();
                    
                    if (capturedCount === totalPokemon) {
                        triggerPokedexCompletionCelebration();
                    }
                }, 500);
            }
        } else {
            // Se for uma captura duplicada, apenas mostra a animação.
            showHighlightAnimation(data.id, data.name, targetCard, 'Captura Duplicada!');
        }
    }
    

    // --- SEÇÃO 7: LÓGICA DE TESTE E BANCO DE DADOS INTERNO ---

    // Um "banco de dados" local com todos os nomes dos Pokémon, usado para preencher os cards.
    const POKEMON_NAMES = ["Bulbasaur", "Ivysaur", "Venusaur", "Charmander", "Charmeleon", "Charizard", "Squirtle", "Wartortle", "Blastoise", "Caterpie", "Metapod", "Butterfree", "Weedle", "Kakuna", "Beedrill", "Pidgey", "Pidgeotto", "Pidgeot", "Rattata", "Raticate", "Spearow", "Fearow", "Ekans", "Arbok", "Pikachu", "Raichu", "Sandshrew", "Sandslash", "Nidoran♀", "Nidorina", "Nidoqueen", "Nidoran♂", "Nidorino", "Nidoking", "Clefairy", "Clefable", "Vulpix", "Ninetales", "Jigglypuff", "Wigglytuff", "Zubat", "Golbat", "Oddish", "Gloom", "Vileplume", "Paras", "Parasect", "Venonat", "Venomoth", "Diglett", "Dugtrio", "Meowth", "Persian", "Psyduck", "Golduck", "Mankey", "Primeape", "Growlithe", "Arcanine", "Poliwag", "Poliwhirl", "Poliwrath", "Abra", "Kadabra", "Alakazam", "Machop", "Machoke", "Machamp", "Bellsprout", "Weepinbell", "Victreebel", "Tentacool", "Tentacruel", "Geodude", "Graveler", "Golem", "Ponyta", "Rapidash", "Slowpoke", "Slowbro", "Magnemite", "Magneton", "Farfetch'd", "Doduo", "Dodrio", "Seel", "Dewgong", "Grimer", "Muk", "Shellder", "Cloyster", "Gastly", "Haunter", "Gengar", "Onix", "Drowzee", "Hypno", "Krabby", "Kingler", "Voltorb", "Electrode", "Exeggcute", "Exeggutor", "Cubone", "Marowak", "Hitmonlee", "Hitmonchan", "Lickitung", "Koffing", "Weezing", "Rhyhorn", "Rhydon", "Chansey", "Tangela", "Kangaskhan", "Horsea", "Seadra", "Goldeen", "Seaking", "Staryu", "Starmie", "Mr. Mime", "Scyther", "Jynx", "Electabuzz", "Magmar", "Pinsir", "Tauros", "Magikarp", "Gyarados", "Lapras", "Ditto", "Eevee", "Vaporeon", "Jolteon", "Flareon", "Porygon", "Omanyte", "Omastar", "Kabuto", "Kabutops", "Aerodactyl", "Snorlax", "Articuno", "Zapdos", "Moltres", "Dratini", "Dragonair", "Dragonite", "Mewtwo", "Mew"];

    /**
     * Configura todos os botões de teste para o administrador.
     * Eles enviam comandos para as rotas seguras do servidor.
     */
    function setupTestButtons() {
        // Botão para simular uma NOVA captura aleatória.
        testNewButton.addEventListener('click', () => {
            const uncapturedCards = document.querySelectorAll('.pokemon-card:not(.captured)');
            if (uncapturedCards.length === 0) {
                alert('Parabéns! Todos os Pokémon já foram capturados!');
                return;
            }
            const randomCard = uncapturedCards[Math.floor(Math.random() * uncapturedCards.length)];
            const id = parseInt(randomCard.dataset.id);
            const name = POKEMON_NAMES[id - 1];
            // Simula uma nova captura como se viesse do servidor.
            handlePokemonAction({ id, name, action: 'new_capture' });
        });

        // Botão para simular uma captura DUPLICADA aleatória.
        testDuplicateButton.addEventListener('click', () => {
            const capturedCards = document.querySelectorAll('.pokemon-card.captured');
            if (capturedCards.length === 0) { alert('Capture um Pokémon primeiro para testar a duplicata.'); return; }
            const randomCapturedCard = capturedCards[Math.floor(Math.random() * capturedCards.length)];
            const id = parseInt(randomCapturedCard.dataset.id);
            const name = randomCapturedCard.querySelector('.pokemon-name').textContent;
            handlePokemonAction({ id, name, action: 'duplicate_capture' });
        });

        // Botão para ZERAR todo o progresso, enviando o comando ao servidor.
        testResetButton.addEventListener('click', () => {
            const secret = prompt('Esta ação vai zerar a Pokédex para TODOS. Digite a senha de administrador:');
            if (secret) {
                fetch('/admin/reset', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ secret: secret }),
                })
                .then(response => response.text())
                .then(message => alert(message))
                .catch(err => alert('Ocorreu um erro de comunicação com o servidor.'));
            }
        });

        // Botão para COMPLETAR a Pokédex, enviando o comando ao servidor.
        testCompleteButton.addEventListener('click', () => {
            const secret = prompt('Esta ação vai completar a Pokédex para TODOS. Digite a senha de administrador:');
            if (secret) {
                fetch('/admin/complete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ secret: secret }),
                })
                .then(response => response.text())
                .then(message => alert(message))
                .catch(err => alert('Ocorreu um erro de comunicação com o servidor.'));
            }
        });
    }

    // --- SEÇÃO 8: LÓGICA DE ROLAGEM AUTOMÁTICA (AUTO-SCROLL) ---

    // Variável que irá armazenar o intervalo de tempo da rolagem.
    let autoScrollInterval = null;

    // Variável de controle para saber se deve rolar para baixo ou para cima.
    let scrollingDown = true;

    /**
     * Para completamente a rolagem automática da página.
     * Cancela o intervalo se ele estiver ativo.
     */
    function stopAutoScroll() {
        if (autoScrollInterval) { // Verifica se há um intervalo em andamento
            clearInterval(autoScrollInterval); // Para o intervalo
            autoScrollInterval = null; // Limpa a variável
        }
    }

    /**
     * Lida com a interação do usuário (clique, toque, roda do mouse),
     * interrompendo a rolagem e agendando sua retomada após um tempo.
     */
    function handleUserInteraction() {
        stopAutoScroll(); // Para a rolagem atual

        // Se já existe um agendamento para reiniciar, cancela ele
        if (restartScrollTimeout) {
            clearTimeout(restartScrollTimeout);
        }

        // Agenda a rolagem para reiniciar após 10 segundos de inatividade
        restartScrollTimeout = setTimeout(() => {
            // Verifica se a rolagem automática está habilitada
            if (isAutoScrollEnabled) {
                startAutoScroll(); // Reinicia a rolagem
            }
        }, 10000); // 10000 milissegundos = 10 segundos
    }

    /**
     * Inicia a rolagem automática em pequenos passos,
     * alternando entre descer e subir suavemente.
     */
    function startAutoScroll() {
        stopAutoScroll(); // Garante que não haja múltiplas rolagens ativas

        // Define os parâmetros da rolagem
        const STEP = 1; // Quantos pixels serão rolados a cada passo
        const INTERVAL = 20; // Tempo (ms) entre cada passo de rolagem
        const PAUSE_AT_TOP_BOTTOM = 2000; // Pausa ao chegar no topo ou fim (em ms)

        // Inicia um intervalo que roda continuamente
        autoScrollInterval = setInterval(() => {

            // Obtém a posição atual do scroll vertical (quantos pixels rolados)
            const scrollTop = window.scrollY;

            // Altura visível da tela (sem rolagem)
            const viewportHeight = window.innerHeight;

            // Altura total da página, incluindo o que não está visível
            const scrollHeight = document.body.scrollHeight;

            if (scrollingDown) {
                // Verifica se chegou ao final da página
                if (scrollTop + viewportHeight >= scrollHeight) {
                    scrollingDown = false; // Muda a direção para cima
                    stopAutoScroll(); // Para o scroll atual

                    // Aguarda um tempo parado antes de começar a rolar para cima
                    autoScrollInterval = setTimeout(startAutoScroll, PAUSE_AT_TOP_BOTTOM);
                } else {
                    // Rola para baixo um pequeno passo
                    window.scrollBy(0, STEP);
                }
            } else {
                // Verifica se chegou ao topo da página
                if (scrollTop <= 0) {
                    scrollingDown = true; // Muda a direção para baixo
                    stopAutoScroll(); // Para o scroll atual

                    // Aguarda um tempo parado antes de começar a rolar para baixo
                    autoScrollInterval = setTimeout(startAutoScroll, PAUSE_AT_TOP_BOTTOM);
                } else {
                    // Rola para cima um pequeno passo
                    window.scrollBy(0, -STEP);
                }
            }

        }, INTERVAL); // Executa o bloco acima a cada INTERVAL milissegundos
    }

    // Adiciona ouvintes de eventos para detectar interações do usuário.
    // Qualquer clique, toque ou rolagem do mouse pausa a rolagem automática.

    // Detecta rolagem com a roda do mouse
    window.addEventListener('wheel', handleUserInteraction, { passive: true });

    // Detecta toques em telas sensíveis (celulares/tablets)
    window.addEventListener('touchstart', handleUserInteraction, { passive: true });

    // Detecta cliques com o mouse
    window.addEventListener('mousedown', handleUserInteraction);

    // --- FINALMENTE, INICIA A APLICAÇÃO ---
    initialize();
});