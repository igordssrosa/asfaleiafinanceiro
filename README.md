# Asfaleia — Sistema Financeiro e de Gestão

Sistema web **full stack** desenvolvido para centralizar a gestão financeira, produtos e estoque da **Asfaleia**.

O projeto foi desenvolvido com foco em **organização de dados, segurança, rastreabilidade das operações e praticidade para o uso diário**.

---

## Sobre o projeto

O Asfaleia é uma aplicação criada para atender necessidades reais de gestão de um pequeno negócio, centralizando diferentes processos em um único sistema.

A aplicação permite gerenciar:

- Movimentações financeiras
- Produtos
- Controle de estoque
- Estoque por cor e tamanho
- Precificação
- Relatórios
- Registro de atividades
- Lixeira e restauração de registros
- Autenticação e controle de sessão

A aplicação possui uma arquitetura separada entre **frontend e backend**, utilizando uma API REST para comunicação e **MongoDB Atlas** para persistência dos dados.

---

# Funcionalidades

## Dashboard

Painel principal para acompanhamento das informações financeiras e operacionais do sistema.

---

## Movimentações financeiras

Permite registrar e acompanhar:

- Receitas
- Despesas
- Categorias
- Formas de pagamento
- Datas
- Status
- Observações

Os registros podem ser enviados para a lixeira, restaurados ou excluídos permanentemente.

---

## Produtos

Cadastro e gerenciamento dos produtos da Asfaleia.

Cada produto possui informações como:

- Nome
- SKU
- Categoria
- Custo unitário
- Preço de venda

O controle de quantidade, cores, tamanhos e disponibilidade é realizado no módulo de estoque.

---

## Controle de estoque

O estoque é organizado por variações de produto, permitindo controlar diferentes combinações de cor e tamanho.

É possível gerenciar:

- Quantidade de peças
- Cores
- Tamanhos
- Combinações de cor e tamanho
- Produtos ativos e inativos
- Estoque normal
- Estoque baixo
- Produtos sem estoque

### Cores disponíveis

- Branca
- Preta
- Cinza
- Bege

### Tamanhos disponíveis

- P
- M
- G
- GG
- G1

O gerenciamento permite adicionar e remover variações de cada produto, além da exclusão do produto mediante confirmação.

---

## Calculadora de precificação

Ferramenta desenvolvida para auxiliar na definição do preço de venda.

Permite analisar informações como:

- Custo do produto
- Preço de venda
- Margem
- Lucro
- Custos adicionais

---

## Relatórios

Área destinada à análise dos dados registrados no sistema.

Permite acompanhar informações financeiras e operacionais de maneira organizada.

---

## Auditoria

O sistema registra as principais ações realizadas pelos usuários.

Os registros podem armazenar:

- Usuário
- E-mail
- Ação realizada
- Módulo
- Descrição
- ID do registro
- Data e hora
- Endereço IP
- User Agent

Os logs possuem retenção automática de **7 dias**, utilizando TTL no MongoDB.

---

## Lixeira

Os registros excluídos são enviados para uma lixeira antes da exclusão permanente.

É possível:

- Visualizar registros excluídos
- Restaurar registros
- Excluir permanentemente

A exclusão permanente exige confirmação na interface.

---

# Autenticação

O sistema possui autenticação e gerenciamento de sessão utilizando:

- Login
- Logout
- Access Token
- Refresh Token
- Cookies HTTP
- Proteção de rotas
- Controle de sessão
- Hash de senhas
- Rate Limiting
- Headers de segurança

As sessões possuem validade absoluta de **12 horas**.

O Refresh Token pode renovar o Access Token durante esse período, sem prolongar o vencimento original da sessão.

---

# Usuários

O sistema utiliza atualmente usuários com a função:

    owner

Não existe uma rota pública para criação de usuários.

O cadastro inicial é realizado através de um script do backend.

Atualmente, o script trabalha com dois proprietários ativos.

---

# Criando usuários para testar o projeto

Caso você queira executar o projeto na sua própria máquina, pode utilizar seus próprios usuários e seu próprio banco MongoDB Atlas.

Primeiro, configure o arquivo `.env` do backend.

Exemplo:

    PORT=3333
    FRONTEND_URL=http://localhost:5173

    MONGODB_URI=sua_connection_string

    JWT_ACCESS_SECRET=sua_chave_secreta
    JWT_REFRESH_SECRET=sua_chave_secreta

    OWNER_1_NAME=Seu Nome
    OWNER_1_EMAIL=seuemail@email.com
    OWNER_1_PASSWORD=SuaSenhaForte123!

    OWNER_2_NAME=Segundo Usuario
    OWNER_2_EMAIL=segundo@email.com
    OWNER_2_PASSWORD=OutraSenhaForte123!

As senhas precisam possuir:

- Pelo menos 12 caracteres
- Uma letra minúscula
- Uma letra maiúscula
- Um número
- Um caractere especial

Exemplo:

    MinhaSenha123!

Depois de configurar as variáveis de ambiente, execute o script de criação dos proprietários.

Caso exista o script configurado no `package.json`:

    npm run create:owners

Ou execute diretamente:

    npx tsx src/scripts/createOwners.ts

O script irá:

1. Validar as variáveis de ambiente.
2. Conectar ao MongoDB.
3. Verificar se os e-mails já existem.
4. Criar os usuários que ainda não existem.
5. Gerar o hash das senhas utilizando bcrypt.
6. Definir os usuários como `owner`.
7. Verificar a quantidade de proprietários ativos.
8. Encerrar a conexão com o banco.

Se um usuário já existir, ele não será alterado.

---

# Utilizando seu próprio MongoDB Atlas

Para executar o projeto com seus próprios dados, crie um banco no MongoDB Atlas.

Depois de criar o cluster, obtenha sua Connection String e configure:

    MONGODB_URI=mongodb+srv://usuario:senha@seu-cluster.mongodb.net/asfaleia

Cada pessoa que executar o projeto deve utilizar:

- Seu próprio MongoDB Atlas
- Sua própria Connection String
- Seus próprios usuários
- Suas próprias chaves JWT

Não é necessário utilizar o banco de dados utilizado pelo autor do projeto.

Depois de configurar o `MONGODB_URI`, execute o script de criação dos usuários:

    npm run create:owners

Os usuários serão criados diretamente no banco configurado no seu `.env`.

---

# Redefinindo a senha

Caso seja necessário redefinir a senha de um proprietário, existe um script específico.

Configure no `.env`:

    RESET_OWNER_EMAIL=seuemail@email.com
    RESET_OWNER_PASSWORD=NovaSenhaForte123!

Depois execute:

    npm run reset:owner-password

Ou diretamente:

    npx tsx src/scripts/resetOwnerPassword.ts

O script procura o proprietário pelo e-mail informado e substitui o hash da senha.

A nova senha também precisa possuir:

- Pelo menos 12 caracteres
- Uma letra minúscula
- Uma letra maiúscula
- Um número
- Um caractere especial

A senha não é armazenada diretamente no banco. Apenas o hash gerado pelo `bcrypt` é armazenado.

---

# Segurança das credenciais

Nunca coloque credenciais reais diretamente no código.

O arquivo `.env` deve permanecer fora do Git.

Adicione ao `.gitignore`:

    .env
    .env.local
    .env.production

Recomenda-se disponibilizar apenas um arquivo `.env.example` no repositório.

Exemplo:

    PORT=
    FRONTEND_URL=

    MONGODB_URI=

    JWT_ACCESS_SECRET=
    JWT_REFRESH_SECRET=

    OWNER_1_NAME=
    OWNER_1_EMAIL=
    OWNER_1_PASSWORD=

    OWNER_2_NAME=
    OWNER_2_EMAIL=
    OWNER_2_PASSWORD=

Isso permite que outra pessoa clone o projeto, crie seu próprio `.env` e configure suas próprias credenciais.

---

# Tecnologias utilizadas

## Frontend

- React
- TypeScript
- Vite
- React Router
- CSS
- Fetch API

## Backend

- Node.js
- TypeScript
- Express
- Mongoose
- REST API
- Zod

## Banco de dados

- MongoDB
- MongoDB Atlas

## Segurança

- Helmet
- CORS
- Express Rate Limit
- Cookie Parser
- bcryptjs
- JWT
- Cookies HTTP
- Zod

## Ferramentas

- Git
- GitHub
- Visual Studio Code

---

# Arquitetura

O projeto é dividido em duas aplicações principais:

    asfaleia/
    │
    ├── backend/
    │   └── src/
    │       ├── config/
    │       ├── controllers/
    │       ├── middlewares/
    │       ├── models/
    │       ├── routes/
    │       ├── services/
    │       ├── utils/
    │       ├── scripts/
    │       └── server.ts
    │
    └── frontend/
        └── src/
            ├── components/
            ├── pages/
            ├── services/
            ├── types/
            ├── App.tsx
            └── main.tsx

### Fluxo da aplicação

    ┌──────────────┐
    │    React     │
    │  TypeScript  │
    └──────┬───────┘
           │
           │ HTTP / REST API
           ▼
    ┌──────────────┐
    │   Express    │
    │  TypeScript  │
    └──────┬───────┘
           │
           │ Mongoose
           ▼
    ┌──────────────┐
    │ MongoDB Atlas│
    └──────────────┘

---

# Segurança

A aplicação foi desenvolvida considerando segurança desde a autenticação até a comunicação com a API.

Entre as medidas implementadas estão:

- Autenticação baseada em tokens
- Access Token e Refresh Token
- Cookies HTTP
- Senhas armazenadas com bcrypt
- Proteção de rotas
- CORS configurado
- Helmet
- Rate Limiting
- Limitação específica para tentativas de login
- Validação com Zod
- Validação das variáveis de ambiente
- Controle de sessão no MongoDB
- Expiração absoluta da sessão
- Auditoria das operações
- Exclusão lógica
- Exclusão permanente mediante confirmação

---

# Controle de sessão

As sessões dos usuários são armazenadas no MongoDB.

O fluxo utiliza:

    Access Token
          +
    Refresh Token
          +
       Session

A sessão possui um vencimento absoluto definido no momento do login.

A renovação do Access Token não aumenta o tempo total da sessão.

O sistema também registra informações como:

- User Agent
- Endereço IP
- Último uso
- Data de expiração
- Revogação da sessão

---

# Controle de requisições

A API possui Rate Limiting para evitar abuso e excesso de requisições.

A rota de login possui uma proteção específica:

    10 tentativas
    a cada 15 minutos

As demais rotas possuem um limite geral maior para evitar excesso de requisições sem prejudicar o funcionamento normal da aplicação.

Quando o limite é atingido, a API informa que é necessário aguardar alguns minutos antes de realizar novas requisições.

---

# Auditoria

As principais operações realizadas no sistema podem gerar registros de auditoria.

As ações registradas incluem:

    create
    update
    move_to_trash
    restore
    permanent_delete
    login
    logout

Os recursos auditados incluem:

    transaction
    product
    pricing_calculation
    authentication

Os logs armazenam informações como:

- Usuário
- E-mail
- Ação
- Recurso
- ID do recurso
- Descrição
- Metadata
- Endereço IP
- User Agent
- Data e hora

Os logs possuem retenção automática de **7 dias** através de um índice TTL do MongoDB.

---

# Banco de dados

O sistema utiliza MongoDB Atlas como banco de dados principal.

Principais entidades:

    User
    Session
    Transaction
    Product
    Inventory
    PricingCalculation
    AuditLog

Os documentos utilizam campos de controle como:

    createdAt
    updatedAt
    createdBy
    updatedBy
    deletedAt
    deletedBy

Esses campos permitem manter rastreabilidade e implementar mecanismos de exclusão lógica.

---

# Lixeira

O sistema utiliza exclusão lógica para determinados registros.

Ao excluir um registro, são utilizados campos como:

    deletedAt
    deletedBy

O registro pode posteriormente ser:

- Restaurado
- Excluído permanentemente

A exclusão permanente exige confirmação na interface.

---

# Interface

A aplicação possui:

- Dark Mode
- Light Mode
- Layout responsivo
- Menu lateral
- Navegação protegida
- Perfil do usuário
- Gerenciamento de sessão
- Modais
- Confirmação para ações destrutivas
- Mensagens de sucesso
- Mensagens de erro

A interface foi desenvolvida buscando manter uma identidade visual consistente com a marca Asfaleia.

---

# Principais rotas

## Frontend

    /dashboard
    /movimentacoes
    /produtos
    /estoque
    /calculadoras
    /relatorios
    /atividades
    /lixeira

## Backend

    /api/auth
    /api/transactions
    /api/products
    /api/inventory
    /api/pricing-calculations
    /api/reports
    /api/audit-logs
    /api/health

---

# Rotas de autenticação

    POST /api/auth/login
    POST /api/auth/refresh
    POST /api/auth/logout
    GET  /api/auth/me

Não existe uma rota pública para criação de usuários.

O cadastro inicial é feito através do script:

    npm run create:owners

---

# Como executar o projeto

## 1. Clone o repositório

    git clone <URL_DO_REPOSITORIO>
    cd financeiroloja

---

## 2. Configure o Backend

Entre na pasta:

    cd backend

Instale as dependências:

    npm install

Crie o arquivo `.env`:

    PORT=3333
    FRONTEND_URL=http://localhost:5173

    MONGODB_URI=sua_connection_string

    JWT_ACCESS_SECRET=sua_chave_secreta
    JWT_REFRESH_SECRET=sua_chave_secreta

    OWNER_1_NAME=Seu Nome
    OWNER_1_EMAIL=seuemail@email.com
    OWNER_1_PASSWORD=SuaSenhaForte123!

    OWNER_2_NAME=Segundo Usuario
    OWNER_2_EMAIL=segundo@email.com
    OWNER_2_PASSWORD=OutraSenhaForte123!

---

## 3. Configure o MongoDB

Crie seu próprio cluster no MongoDB Atlas.

Depois coloque a Connection String no:

    MONGODB_URI

Exemplo:

    MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/asfaleia

---

## 4. Crie os usuários

Execute:

    npm run create:owners

Ou:

    npx tsx src/scripts/createOwners.ts

Depois da execução, os usuários configurados no `.env` estarão disponíveis para login.

---

## 5. Inicie o Backend

Execute:

    npm run dev

Por padrão:

    http://localhost:3333

---

## 6. Configure o Frontend

Abra outro terminal:

    cd frontend

Instale as dependências:

    npm install

Inicie:

    npm run dev

Por padrão:

    http://localhost:5173

---

# Verificando a API

A API possui um endpoint de health check:

    GET /api/health

Acesse:

    http://localhost:3333/api/health

Quando estiver funcionando corretamente, o retorno deverá indicar que a API e o banco estão conectados.

Exemplo:

    {
      "status": "ok",
      "message": "API da Asfaleia funcionando",
      "database": "connected"
    }

---

# Fluxo para executar o projeto pela primeira vez

    1. Clonar o repositório
           ↓
    2. Instalar dependências do backend
           ↓
    3. Criar MongoDB Atlas próprio
           ↓
    4. Criar arquivo .env
           ↓
    5. Configurar MONGODB_URI
           ↓
    6. Configurar usuários
           ↓
    7. Executar createOwners
           ↓
    8. Iniciar backend
           ↓
    9. Instalar dependências do frontend
           ↓
    10. Iniciar frontend
           ↓
    11. Acessar http://localhost:5173

---

# Variáveis de ambiente

## Backend

    PORT=
    FRONTEND_URL=

    MONGODB_URI=

    JWT_ACCESS_SECRET=
    JWT_REFRESH_SECRET=

    OWNER_1_NAME=
    OWNER_1_EMAIL=
    OWNER_1_PASSWORD=

    OWNER_2_NAME=
    OWNER_2_EMAIL=
    OWNER_2_PASSWORD=

Para redefinição de senha:

    RESET_OWNER_EMAIL=
    RESET_OWNER_PASSWORD=

---

# Objetivos técnicos

O projeto foi desenvolvido como forma de consolidar conhecimentos em:

- Desenvolvimento Full Stack
- React
- TypeScript
- Node.js
- Express
- APIs REST
- MongoDB
- Mongoose
- Modelagem de dados
- Autenticação
- Segurança de aplicações
- Controle de estoque
- Tratamento de erros
- Arquitetura de software
- Git e GitHub
- Desenvolvimento baseado em necessidades reais

---

# Próximas evoluções

A arquitetura do projeto permite futuras implementações, como:

- Dashboard financeiro mais avançado
- Indicadores de estoque
- Histórico detalhado de movimentações de estoque
- Exportação de relatórios
- Gráficos financeiros
- Notificações de estoque baixo
- Melhorias na análise financeira
- Integrações com serviços externos
- Diferentes níveis de acesso e permissões

---

# Status

**Em desenvolvimento contínuo.**

O sistema está sendo evoluído conforme novas necessidades são identificadas, buscando melhorar continuamente:

- Organização
- Segurança
- Usabilidade
- Automação
- Análise de dados

---

# Autor

**Igor Rosa**

Projeto desenvolvido como parte da minha evolução prática em:

**Desenvolvimento de Software · Análise de Dados · Bancos de Dados · Desenvolvimento Full Stack**

---

# Licença

Projeto de uso pessoal e demonstrativo.

Não autorizado para redistribuição comercial sem permissão do autor.
