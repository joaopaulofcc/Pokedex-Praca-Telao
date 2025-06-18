# Pokédex Comunitária - Telão Interativo 📺✨

<p align="center">
  <img src="https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZzcwanhhc2owOGV4bDBubXNsMTJkcjBwZXN0M2E5YzZodmIzMDg0dCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/aYfKTmefNM70zHI9xR/giphy.gif" alt="Demonstração do Telão Interativo da Pokédex Comunitária">
</p>

## 📖 Sobre o Projeto

O **Telão Interativo da Pokédex Comunitária** é o componente visual principal da experiência criada para o evento **Unilavras na Praça 2025**. Ele funciona como um grande placar em tempo real, exibindo a colaboração de todos os participantes do evento.

Este projeto é um servidor **Node.js** que serve uma página web estática e utiliza **WebSockets** para receber atualizações instantâneas do chatbot. Quando um participante "captura" um Pokémon no chat, este telão exibe uma animação de destaque e revela o Pokémon na grade para todos verem.

---

## 🚀 Principais Funcionalidades

-   **Grade de 151 Pokémon:** Exibe todos os Pokémon da primeira geração, começando como silhuetas e sendo revelados um a um.
-   **Atualizações em Tempo Real:** Graças aos WebSockets, a grade é atualizada para todos os espectadores simultaneamente, sem a necessidade de recarregar a página.
-   **Animação de Captura:** Uma animação de destaque espetacular é acionada no telão a cada nova captura, mostrando o card do Pokémon e o nome dele.
-   **Efeitos Sonoros e Visuais:** Inclui o "grito" de cada Pokémon, música de celebração, confetes e um fundo animado para uma experiência imersiva.
-   **Persistência de Dados Centralizada:** O estado da Pokédex é salvo em um arquivo `pokedex-db.json` no servidor, garantindo que o progresso seja único, contínuo e compartilhado por todos.
-   **Painel de Administração Seguro:** Um painel de teste protegido por senha permite que um administrador zere ou complete a Pokédex em tempo real para todos os participantes.

---

## 🛠️ Tecnologias Utilizadas

Este projeto demonstra a integração entre o frontend e um backend simples com Node.js:

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-010101?style=for-the-badge&logo=websocket&logoColor=white)

---

## ▶️ Como Executar Localmente

Este projeto requer o Node.js instalado na sua máquina.

1.  **Clone o repositório:**
    ```bash
    git clone [https://github.com/SEU_USUARIO/Pokedex-Praca-Telao.git](https://github.com/SEU_USUARIO/Pokedex-Praca-Telao.git)
    ```
2.  **Instale as dependências:**
    ```bash
    cd Pokedex-Praca-Telao
    npm install
    ```
3.  **Inicie o servidor:**
    ```bash
    node server.js
    ```
    > Ao iniciar pela primeira vez, o arquivo `pokedex-db.json` será criado automaticamente.

4.  **Acesse no navegador:** `http://localhost:3000`.

---

## 🚀 Deploy e Configuração no Render

O projeto está pronto para ser hospedado em plataformas como o Render. Siga os passos abaixo para colocar seu telão online.

1.  **Crie uma conta:** Se ainda não tiver, crie uma conta no [Render.com](https://render.com/).

2.  **Crie um "New Web Service":**
    -   No seu dashboard, clique em **New +** e selecione **Web Service**.
    -   Conecte sua conta do GitHub e selecione o repositório `Pokedex-Praca-Telao`.

3.  **Configure o Serviço:**
    -   **Name:** Dê um nome único para o seu serviço (ex: `pokedex-unilavras`).
    -   **Region:** Escolha uma região (ex: `São Paulo`).
    -   **Branch:** Selecione a branch principal do seu repositório (geralmente `main` ou `master`).
    -   **Root Directory:** Deixe em branco se o `package.json` estiver na raiz do projeto.
    -   **Runtime:** Render deve detectar automaticamente `Node`.
    -   **Build Command:** `npm install`
    -   **Start Command:** `node server.js`

4.  **Adicione as Variáveis de Ambiente (Muito Importante):**
    -   Antes de criar o serviço, vá para a seção **"Advanced"**.
    -   Clique em **"Add Environment Variable"** duas vezes para adicionar as seguintes chaves:
        1.  **Key:** `ADMIN_SECRET`
            -   **Value:** `coloque-sua-senha-super-secreta-aqui` (para o painel de admin)
        2.  **Key:** `N8N_WEBHOOK_SECRET`
            -   **Value:** `outra-senha-super-secreta-para-o-n8n` (para a comunicação com n8n)

5.  **Crie o Serviço:**
    -   Clique em **"Create Web Service"**. O Render irá fazer o deploy do seu projeto. Aguarde até que o status seja "Live".

6.  **Configure o n8n para Enviar o Webhook com o Segredo:**
    -   Após o deploy, o Render fornecerá a URL pública do seu serviço (ex: `https://pokedex-unilavras.onrender.com`).
    -   No seu workflow do **n8n**:
        1.  Encontre o nó **"HTTP Request"** que envia os dados para o seu telão.
        2.  No campo **URL**, cole a URL completa do seu serviço, seguida de `/capture`. Ex: `https://pokedex-unilavras.onrender.com/capture`.
        3.  Vá para a aba **"Headers"**.
        4.  Clique em **"Add Header"**.
        5.  Preencha os campos:
            -   **Name:** `x-webhook-secret`
            -   **Value:** `outra-senha-super-secreta-para-o-n8n` (use **exatamente** o mesmo valor que você colocou em `N8N_WEBHOOK_SECRET` no Render).
    
    > **Atenção:** Sem este passo, o n8n não enviará a "senha", e o nosso servidor seguro irá rejeitar todas as capturas, bloqueando o funcionamento do projeto.


---

## ⚙️ Modo de Administração e Teste

Para facilitar o gerenciamento do evento e a demonstração do telão, o projeto inclui um painel de administração seguro, acessível diretamente pela interface.

### Como Acessar

1.  Na tela da Pokédex, clique no ícone de engrenagem (⚙️) no canto superior direito.
2.  Uma caixa de diálogo irá solicitar a **senha de administrador**.
3.  Digite a senha que foi configurada na variável de ambiente `ADMIN_SECRET`.
4.  Se a senha estiver correta, o painel de controles de teste aparecerá no topo da tela.

### Funcionalidades do Painel de Administração

-   **Testar Nova Captura:** Simula a captura de um Pokémon aleatório que ainda não foi pego na Pokédex. Esta ação é apenas visual e não afeta o banco de dados.
-   **Testar Captura Repetida:** Simula a captura de um Pokémon já registrado. Esta ação é apenas visual.
-   **Zerar Pokédex:** (**Ação Real**) Envia um comando seguro para o servidor, que **apaga todo o progresso** do banco de dados `pokedex-db.json`. A mudança é refletida para todos os espectadores instantaneamente.
-   **Completar Pokédex:** (**Ação Real**) Envia um comando seguro para o servidor, que **marca todos os 151 Pokémon como capturados**. A mudança é refletida para todos os espectadores.

---

## 📂 Estrutura do Projeto

-   `server.js`: O cérebro do backend. Cria o servidor, serve os arquivos da pasta `public` e gerencia a comunicação WebSocket.
-   `package.json`: O "RG" do projeto, que lista as dependências (Express, ws).
-   `/public`: Pasta que contém todos os arquivos que são enviados para o navegador.
    -   `index.html`: O "esqueleto" da página.
    -   `style.css`: O "diretor de arte", responsável por todo o visual e animações.
    -   `script.js`: O "cérebro" do frontend, que desenha a grade e reage às mensagens do WebSocket.

---

## 🔮 Próximos Passos

Embora o projeto esteja funcional para o evento, algumas melhorias futuras poderiam ser implementadas:

-   **Migração para um Banco de Dados Real:** Substituir o arquivo `pokedex-db.json` por um serviço de banco de dados mais robusto (como PostgreSQL no Render, Supabase ou Firebase) para garantir a persistência dos dados mesmo entre deploys.
-   **Animações de Conquistas:** Criar pequenas celebrações na tela quando 10, 50 ou 100 Pokémon forem capturados.
-   **Placar de Treinadores:** Adicionar um pequeno placar que mostre o nome dos últimos treinadores que fizeram uma captura.

---

## ⚖️ Aviso Legal e Créditos

> Este é um projeto de fãs, sem fins lucrativos, criado para fins educacionais e de entretenimento como parte de um evento acadêmico. Pokémon e todos os nomes, imagens e sons associados são marcas registradas e direitos autorais de ©1995-2025 Nintendo, Game Freak e The Pokémon Company.

Este projeto só foi possível graças aos incríveis recursos disponibilizados pela comunidade de fãs e desenvolvedores. Agradecemos e damos o devido crédito às seguintes fontes:

-   **Imagens dos Pokémon:** As imagens e silhuetas dos Pokémon são obtidas do fantástico arquivo mantido por [**Gearoid.me**](https://gearoid.me/pokemon/).

-   **Sons dos Pokémon:** Os "gritos" característicos de cada Pokémon são fornecidos pelo excelente recurso [**PokemonCries.com**](https://pokemoncries.com/).

-   **Música de Celebração:** A nostálgica música de abertura de Pokémon Red/Blue, usada na celebração de conclusão, é um tesouro preservado pelo [**VGM Treasure Chest**](https://eta.vgmtreasurechest.com/).

---

## 🎓 Um Projeto do Curso de ADS

Este projeto, em conjunto com o [**Pokedex-Praca-Chat**](https://github.com/joaopaulofcc/Pokedex-Praca-Chat), é uma vitrine do curso de **Análise e Desenvolvimento de Sistemas do Unilavras**, criado especialmente para apresentação no evento **Unilavras na Praça 2025**. Ele demonstra a criação de uma aplicação full-stack interativa e o potencial dos nossos futuros desenvolvedores.

> **Venha para o ADS e transforme suas ideias em realidade!**