<p align="center">
  <img src="public/logo.png" alt="Verdant" width="120" />
</p>

<h1 align="center">Verdant Nest</h1>

<p align="center">
  API/servidor de um app de relacionamentos: cadastro, feed por geolocalização, likes &amp; matches e chat em tempo real.
</p>

<p align="center">
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white" />
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-Mongoose%208-47A248?logo=mongodb&logoColor=white" />
  <img alt="Redis" src="https://img.shields.io/badge/Redis-ioredis-DC382D?logo=redis&logoColor=white" />
  <img alt="Socket.IO" src="https://img.shields.io/badge/Socket.IO-4-010101?logo=socketdotio&logoColor=white" />
  <img alt="Jest" src="https://img.shields.io/badge/tests-Jest-C21325?logo=jest&logoColor=white" />
</p>

---

## Sumário

- [Funcionalidades](#funcionalidades)
- [Stack](#stack)
- [Como rodar](#como-rodar)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Autenticação](#autenticação)
- [Endpoints](#endpoints)
- [Chat em tempo real (WebSocket)](#chat-em-tempo-real-websocket)
- [Regras de negócio](#regras-de-negócio)
- [Testes](#testes)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Próximos passos](#próximos-passos)

## Funcionalidades

- 👤 **Usuários**: cadastro com validação (e-mail, telefone E.164, data de nascimento), perfil completo (fotos, sobre mim, interesses, idiomas…). Senha e refresh token **nunca** saem nas respostas.
- 🔒 **Autenticação JWT**: access token (1h) e refresh token (10d) com **rotação**, logout que invalida o refresh e um JWT separado para admins.
- 🧭 **Feed por geolocalização**: perfis próximos (`$geoNear`) dentro da distância e da faixa etária das preferências, sem mostrar quem você já curtiu, passou ou deu match.
- ❤️ **Likes, pass e matches**: curtida recíproca vira match e cria (ou reativa) a conversa automaticamente. Desfazer o match arquiva a conversa.
- 💬 **Conversas e mensagens**: listagem das minhas conversas com a última mensagem, histórico paginado, envio, edição, exclusão e busca de mensagens.
- 🦜 **Chat em tempo real** com Socket.IO: autenticação pelo token, salas por conversa, notificação para o outro participante e presença online no Redis.
- 👑 **Admin**: estatísticas, listagem de usuários, banir/desbanir, verificar e remover usuários.
- 📚 **Swagger** em `/api`.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | [NestJS 11](https://nestjs.com) (TypeScript) |
| Banco | MongoDB + Mongoose 8 (índice `2dsphere` para geolocalização) |
| Cache / presença | Redis (ioredis) |
| Tempo real | Socket.IO (`@nestjs/websockets`) |
| Auth | Passport JWT, bcrypt |
| Validação | class-validator / class-transformer |
| Docs | Swagger (`@nestjs/swagger`) |
| Testes | Jest, Supertest, mongodb-memory-server |

## Como rodar

### Pré-requisitos

- Node.js 20+
- MongoDB e Redis (local ou via Docker)

### Passo a passo

```bash
# 1. Dependências
npm install

# 2. Variáveis de ambiente
cp .env.example .env

# 3. Mongo + Redis (se não tiver instalado localmente)
docker compose up -d

# 4. Servidor em modo desenvolvimento (watch)
npm run dev
```

O servidor sobe em `http://localhost:3000` e a documentação Swagger fica em `http://localhost:3000/api`.

> **npm 11+:** o npm pode bloquear os scripts de instalação de pacotes nativos. Se o `bcrypt` ou o `mongodb-memory-server` falharem, rode
> `npm install-scripts approve bcrypt mongodb-memory-server @swc/core && npm rebuild`.
> (Já deixamos esses três liberados em `allowScripts` no `package.json`.)

### Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` | Sobe em modo watch com `NODE_ENV=development` |
| `npm run start` | Sobe sem watch |
| `npm run build` / `npm run start:prod` | Compila para `dist/` e roda a versão compilada |
| `npm test` | Roda todos os testes (`NODE_ENV=test`) |
| `npm run test:cov` | Testes com cobertura |
| `npm run test:e2e` | Teste e2e de `test/` |
| `npm run lint` / `npm run format` | ESLint / Prettier |

## Variáveis de ambiente

Veja [`.env.example`](.env.example).

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP |
| `MONGO_URI` | `mongodb://localhost:27017/verdant` | Conexão com o MongoDB |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | `localhost` / `6379` / – | Conexão com o Redis |
| `JWT_SECRET` | valor de dev | Secret do access token de usuários |
| `REFRESH_JWT_SECRET` | valor de dev | Secret do refresh token |
| `ADMIN_JWT_SECRET` | valor de dev | Secret do token de admin |
| `ADMIN_SECRET_KEY` | – | Chave exigida no body para criar um admin (`POST /admin`) |
| `RATE_LIMIT_ENABLED` | `true` (`false` em `NODE_ENV=test`) | Liga/desliga o rate limiting |
| `TRUST_PROXY` | – | Atrás de proxy/load balancer: número de proxies confiáveis (o IP real vem do `X-Forwarded-For`) |

> ⚠️ Os valores padrão dos secrets servem só para desenvolvimento. **Sempre** defina secrets próprios em produção.

## Autenticação

```
POST /login            { email, password }   → { access_token, refresh_token, user }
POST /login/refresh    { refresh_token }     → { access_token, refresh_token }   (o refresh antigo deixa de valer)
POST /login/logout     Bearer access_token   → invalida o refresh token
```

Envie o access token no header `Authorization: Bearer <access_token>`.

Admins têm um login separado (`POST /login/admin`), assinado com outro secret: um token de usuário comum **não** acessa rotas de admin, e vice-versa.

Usuários banidos (`active: false`) não conseguem logar e os tokens já emitidos param de funcionar na hora.

### Rate limiting

Limites por IP (HTTP) e por usuário (WebSocket). Acima do limite, a resposta é **429** com o header `Retry-After`.

| Onde | Limite |
| --- | --- |
| Qualquer rota HTTP | 120 por minuto |
| `POST /login` e `POST /login/admin` | 5 por minuto |
| `POST /login/refresh` | 20 por minuto |
| `POST /users` (cadastro) | 10 por hora |
| `POST /messages` | 30 por minuto |
| Evento `send_message` (socket) | 20 a cada 10 s por usuário (contador no Redis; responde `send_message_error`) |

Os valores ficam em `src/config/rate-limit.config.ts`. Atrás de proxy, defina `TRUST_PROXY`, senão todos os usuários parecem vir do mesmo IP.

## Endpoints

Legenda: 🌐 público · 🔑 usuário logado · 🙋 apenas o próprio usuário · 👑 admin

### Auth — `/login`

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| POST | `/login` | 🌐 | Login do usuário |
| POST | `/login/refresh` | 🌐 | Troca o refresh token por um novo par |
| POST | `/login/logout` | 🔑 | Logout (invalida o refresh token) |
| GET | `/login/auth_ping` | 🔑 | Retorna o usuário do token |
| POST | `/login/admin` | 🌐 | Login de admin |

### Usuários — `/users`

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| POST | `/users` | 🌐 | Cadastro |
| GET | `/users/me` | 🔑 | Meus dados |
| GET | `/users/:id` | 🔑 | Perfil de um usuário |
| PUT | `/users/:id` | 🙋 | Atualiza meus dados (likes, matches, premium, verified etc. são ignorados) |
| DELETE | `/users/:id` | 🙋 | Remove minha conta |
| GET | `/users` | 👑 | Lista todos |
| GET | `/users/email?email=` | 👑 | Busca por e-mail |

### Perfil — `/profile`

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| GET | `/profile/feed` | 🔑 | Perfis próximos para curtir/passar |
| GET / PUT | `/profile/preferences` | 🔑 | Preferências (faixa etária, distância, filtros) |
| GET / PUT | `/profile/about` | 🔑 | Seção "sobre mim" |
| PUT | `/profile/location` | 🔑 | Atualiza a localização `{ longitude, latitude }` |

### Likes — `/likes`

Todas as rotas usam o usuário do token; o body leva só o perfil alvo: `{ "profileToBeLikedId": "<id>" }`.

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| POST | `/likes` | 🔑 | Curte. Retorna `{ liked, match, alreadyLiked, conversationId? }` |
| POST | `/likes/unlike` | 🔑 | Desfaz o like/match (arquiva a conversa) |
| POST | `/likes/pass` | 🔑 | "Passa" o perfil, que não volta mais no feed |
| GET | `/likes/matches` | 🔑 | Meus matches |
| GET | `/likes/received` | 🔑 | Quem me curtiu |

### Conversas — `/conversations`

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| GET | `/conversations/me` | 🔑 | Minhas conversas ativas com a última mensagem |
| GET | `/conversations/:id` | 🔑 participante | Detalhe da conversa |
| GET | `/conversations/:id/messages?limit=&skip=` | 🔑 participante | Histórico paginado (mais recentes primeiro, `limit` máx. 100) |
| GET | `/conversations/between/users?user1=&user2=` | 🔑 | Conversa ativa entre dois usuários (você precisa ser um deles) |
| GET | `/conversations` | 👑 | Todas as conversas |
| POST | `/conversations` | 👑 | Cria manualmente |
| DELETE | `/conversations/:id` | 👑 | Remove a conversa e as mensagens |

### Mensagens — `/messages`

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| POST | `/messages` | 🔑 participante | `{ conversationId, content }` (o remetente é sempre o usuário logado) |
| PATCH | `/messages/:id` | 🔑 autor | Edita `{ content }` (marca `editedAt`) |
| DELETE | `/messages/:id` | 🔑 autor | Remove a mensagem |
| GET | `/messages/search?conversationId=&q=` | 🔑 participante | Busca texto dentro da conversa |

### Admin — `/admin`

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| POST | `/admin` | 🌐 + `adminSecret` | Cria admin (exige `ADMIN_SECRET_KEY`) |
| GET | `/admin` | 👑 | Ping de admin |
| GET | `/admin/stats` | 👑 | Total de usuários, ativos, premium e verificados |
| GET | `/admin/users?active=&limit=&skip=` | 👑 | Lista usuários |
| PATCH | `/admin/users/:id/ban` | 👑 | Bane (desativa e invalida o refresh token) |
| PATCH | `/admin/users/:id/unban` | 👑 | Reativa |
| PATCH | `/admin/users/:id/verify` | 👑 | Marca como verificado |
| DELETE | `/admin/users/:id` | 👑 | Remove o usuário |

### Outros

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| GET | `/` | 🌐 | Página inicial (EJS) |
| GET | `/api` | 🌐 | Swagger |
| GET | `/chat/redis` | 👑 | Diagnóstico da conexão com o Redis |

## Chat em tempo real (WebSocket)

O gateway Socket.IO roda na mesma porta da API.

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: accessToken }, // access_token do POST /login
});

socket.on('auth_error', console.error);

socket.emit('join_conversation', { conversationId });
socket.on('joined_conversation', ({ conversationId }) => {});

socket.emit('send_message', { conversationId, content: 'Oi! 👋' });
socket.on('new_message', message => {});    // todos que estão na sala da conversa
socket.on('notification', payload => {});   // o outro participante, em qualquer tela do app
socket.on('received_message', message => {}); // confirmação para quem enviou

socket.emit('view_messages', { conversationId, limit: 50, skip: 0 });
socket.on('view_messages', ({ messageHistory }) => {});

socket.emit('leave_conversation', { conversationId });
```

| Evento (cliente → servidor) | Payload | Resposta |
| --- | --- | --- |
| `join_conversation` | `{ conversationId }` | `joined_conversation` ou `join_conversation_error` |
| `leave_conversation` | `{ conversationId }` | `left_conversation` |
| `send_message` | `{ conversationId, content }` | `new_message` (sala), `notification` (outro participante), `received_message` (remetente) ou `send_message_error` |
| `view_messages` | `{ conversationId, limit?, skip? }` | `view_messages` ou `view_messages_error` |

- O `userId` **sempre** vem do token (nunca do payload do cliente).
- Só participantes de uma conversa **ativa** entram na sala ou mandam mensagens.
- Presença: `online:<userId>` e `socket:<socketId>` ficam no Redis e são removidos no disconnect.

## Regras de negócio

- **Like**: não dá para curtir a si mesmo. Curtir de novo (ou curtir alguém com quem já deu match) retorna `alreadyLiked: true`.
- **Match**: quando A curte B e B já tinha curtido A, os dois viram match. As curtidas pendentes saem de `likedProfiles`/`likedYouProfiles`, e uma conversa é criada (ou a conversa antiga é **reativada**, caso já tenham dado match antes).
- **Unlike**: remove o like e, se houver match, desfaz o match nos dois perfis e **arquiva** a conversa (`isActive: false`, `archivedAt`). Conversas arquivadas não recebem mensagens.
- **Pass**: o perfil vai para `passedProfiles` e não aparece mais no feed. Curtir depois desfaz o pass.
- **Feed**: até 50 perfis ativos dentro de `preferences.distance` km (padrão 10 km, aceita `"50"` ou `"50km"`) e de `preferences.ageRange`, excluindo eu mesmo, quem eu curti, passei ou dei match. Os resultados vêm ordenados por distância e com o campo `distance` (em metros). E-mail, telefone e as listas internas não aparecem.
  - **Gênero (todos, mútuo):** só aparecem pessoas cujo `gender` está no meu `showMe` **e** cujo `showMe` inclui o meu gênero. `showMe` vazio ou `"everyone"` não restringe. Valores: `women` ↔ `Female`, `men` ↔ `Male`, `non-binary` ↔ `Non-binary`.
  - **Filtros avançados (só premium, rígidos):** `verified`, `height` (faixa), `education` (contém o texto), `alcohol`, `smoking`, `children`, `zodiacSign`, `politicalView` e `religion` (exatos, sem diferenciar maiúsculas). Quem não bate, ou não preencheu o campo filtrado, sai do feed. Para usuários sem premium, os filtros ficam salvos mas não são aplicados.
- **Atualização de usuário**: `PUT /users/:id` ignora campos protegidos (`premium`, `verified`, `active`, `refreshToken`, `matches`, `likedProfiles`, `likedYouProfiles`, `conversations`). A `ValidationPipe` global usa `whitelist: true` e descarta qualquer campo fora do DTO.

## Testes

```bash
npm test                                   # tudo
npx cross-env NODE_ENV=test jest likes     # só os arquivos que casam com "likes"
npm run test:cov                           # cobertura
```

- Cada módulo tem uma pasta `test/` com specs de **service** (regras de negócio) e de **controller** (e2e via Supertest).
- `test/test-setup.ts` → `SetupTestApp()` sobe o `AppModule` inteiro com um **MongoMemoryServer** (a URI vai em `MONGO_URI` antes de compilar o módulo, então os testes nunca tocam no banco real).
- Mocks reutilizáveis: `src/user/test/mock/user.mock.ts` (Bernardo e Maria), `src/conversation/test/mock/`, `src/admin/test/mock/`.
- Os testes de chat/presença e o `database.spec.ts` precisam de **Redis** e de um **MongoDB local** rodando.

Padrão usado nos specs de controller:

```ts
const CREDENTIALS: AuthDto = { email: 'bernardo@example.com', password: 'securePass123' };

const user = await userService.create(mockUser);
const { access_token } = await authService.validateAndLogin(CREDENTIALS);

const response = await request(app.getHttpServer())
	.post('/likes')
	.set('Authorization', `Bearer ${access_token}`)
	.send({ profileToBeLikedId: maria.id });
```

## Estrutura do projeto

```
src/
├── admin/          # Admins + gestão de usuários (ban, verify, stats)
├── auth/           # Login, refresh/logout, JWT strategy, guards e decorators
│   └── decorators/ # @User(), @SelfOnly(), @AdminOnly()
├── chat/           # Gateway Socket.IO + presença no Redis
├── config/         # JWT, Swagger, ValidationPipe, views, arquivos estáticos
├── conversation/   # Conversas (criadas a partir dos matches)
├── database/       # Conexão com o MongoDB
├── likes/          # Like, unlike, pass, matches
├── messages/       # Mensagens (envio, edição, exclusão, busca)
├── profile/        # Feed, preferências, sobre mim, localização
├── redis/          # Cliente e service do Redis
├── security/       # Hash de senhas (bcrypt) e tokens (SHA-256)
├── user/           # Cadastro e dados do usuário
├── utils/          # Helpers (ObjectId, regex etc.)
└── validators/     # Validador de telefone E.164
test/
└── test-setup.ts   # SetupTestApp() usado pelos testes
```

### Imports com `@`

Os imports entre módulos usam aliases em vez de caminhos relativos (`../../`):

| Alias | Aponta para | Exemplo |
| --- | --- | --- |
| `@/*` | `src/*` | `import { UserService } from '@/user/user.service';` |
| `@test/*` | `test/*` | `import { SetupTestApp } from '@test/test-setup';` |

Imports dentro da mesma pasta continuam relativos (`./admin.schema`, `./dto/...`). Os aliases estão em `tsconfig.json` (`paths`) e no `moduleNameMapper` do Jest (`package.json` e `test/jest-e2e.json`). O `nest build` converte os aliases em caminhos relativos no `dist/`, então nada muda em produção.

## Próximos passos

- [ ] Aplicar os `advancedFilters` (verificado, altura, educação, religião…) e o `showMe`/`gender` no feed
- [ ] Upload de fotos (S3 ou similar) em vez de só URLs
- [ ] Bloquear e denunciar usuários
- [ ] Recursos premium (ver quem curtiu, super like, desfazer pass)
- [ ] Indicador de "digitando" e confirmação de leitura no chat
- [ ] Rate limiting (`@nestjs/throttler`) no login e no envio de mensagens
- [ ] Restringir o CORS do WebSocket em produção (`GatewayCors` em `chat/config`)
