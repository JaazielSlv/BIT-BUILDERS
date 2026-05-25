# BIT-BUILDERS

BIT-BUILDERS é uma aplicação web completa para montar e verificar a compatibilidade de componentes de um computador (PC Builder), operando em conjunto com o Firebase Firestore para leitura de banco de dados e avaliação técnica de peças.

## 🚀 Funcionalidades

- **Selecionador de Componentes:** Escolha do Processador, Placa-Mãe, Placa de Vídeo, Memória RAM e Fonte de Alimentação.
- **Validador de Compatibilidade:** Simula a conexão entre as peças (Socket CPU x Placa-Mãe, DDR4 vs DDR5) e balanço de força (consumo estimado/TDP do sistema vs Potência da Fonte).
- **Estimador de FPS (Benchmark):** A partir da construção validada, realiza cálculos para estimar o FPS do sistema caso estivesse rodando jogos famosos em resoluções como 1080p, 1440p e 4K.
- **Contas de Usuário (Acesso & Perfis):** Agora os clientes do site podem se cadastrar e logar para ter uma *"Garagem Virtual"*, salvando suas configurações preferidas (Múltiplas Builds) na nuvem sob sigilo direto no seu próprio painel.
- **Segurança de Acesso Firebase:** Proteção back-end (via Firestore Rules) garantindo que Edições, Exclusões de Peças Globais e afins só possam ser executadas pelo Painel se o usuário for oficialmente detentor do nível `"role: admin"`. Ninguém sem ser `Admin` apaga o site!
- **Auto-injeção Baseada em Imagem:** Carrega dinamicamente a arquitetura ou as peças se o banco estiver vazio. Identifica automaticamente as peças disponíveis (Processador, GPU, etc.) pela leitura da pasta `/img` e lança tudo como Lote (Batch) pro Firebase sem esgorar quotas, criando Fichas Técnicas para cada um automaticamente com base no nome do arquivo.
- **Painel Admin:** Interface simples (`admin.html`) para gerenciamento e sincronismo da Base.
- **Ficha Técnica Interativa:** Clicar na imagem dos componentes em *index.html* lança a sua ficha visual baseada no Firestore.

## 📁 Estrutura de Diretórios

- **Raiz HTMLs** (`index.html`, `admin.html`, `ficha_tecnica.html`, `benchmark.html`) Interface visual.
- **/src/script.js**: Motor principal da simulação do hardware + auto-início quando Firestore estiver limpo.
- **/src/firebase-config.js**: Conexão com Google.
- **/src/injetor.js**: Extrator inteligente e alimentador ultra-rápido de Lote no Banco de Dados para os arquivos da pasta `/img`.
- **/src/benchmark/estimator.js**: A inteligência artificial estática por trás da detecção de frames em cyberpuk/cs/etc...
- **/img/**: Seu repositório de recursos visuais de hardware que guiam o sistema na hora da listagem.

## ⚙️ Uso
Abra o projeto através de um servidor local (ex: _Live Server_ no VS Code), nunca pelo sistema de arquivo do Windows (`file:///...`), para evitar problemas com ESModules. As peças já estão todas cadastradas com base nos seus arquivos da pasta `img`. Caso precise adicionar peças, coloque a foto nova (.png, .jpg) na pasta base `img` e chame a limpeza/injeção novamente pelo Painel de Admin ou Console! 🖥️

## Descrição

**BIT-BUILDERS** é um projeto desenvolvido como parte da disciplina de Empreendedorismo do IFPB (Instituto Federal da Paraíba). A aplicação web visa auxiliar usuários no processo de seleção e visualização de componentes para a montagem de computadores pessoais (PC Building).

Através de uma interface interativa, o BIT-BUILDERS busca simplificar a escolha de peças como placas de vídeo (GPUs), placas-mãe, processadores e memórias RAM.

## 🎯 Objetivo do Projeto

O principal objetivo do BIT-BUILDERS é fornecer uma ferramenta intuitiva para:

* Ajudar entusiastas e iniciantes a entenderem os diferentes componentes de um PC.
* Facilitar a seleção de peças compatíveis.
* Visualizar os componentes escolhidos.
* Potencialmente:
    * Comparar diferentes componentes.
    * Estimar custos.
    * Verificar gargalos de compatibilidade.

## ✨ Funcionalidades 

* **Seleção de Componentes:** Permite ao usuário escolher entre diferentes categorias de hardware:
    * Placas de Vídeo (GPUs)
    * Placas-Mãe
    * Processadores
    * Memórias RAM
* **Visualização de Componentes:** Apresenta imagens dos componentes selecionados.
* **Interface Web Interativa:** Construída para facilitar a navegação e seleção pelo usuário.

## 🛠️ Tecnologias Utilizadas

* **HTML (79.4%)**: Para a estruturação semântica do conteúdo web.
* **CSS (14.1%)**: Para a estilização e design visual da interface.
* **JavaScript (6.5%)**: EM DESENVOLVIMENTO.

## 📂 Estrutura do Projeto

O repositório está organizado com pastas dedicadas para os diferentes tipos de componentes, facilitando a gestão dos assets:
