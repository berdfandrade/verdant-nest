/*
	Seed de desenvolvimento: popula o MongoDB local com uma conta sua e perfis fake.

	  npm run seed

	- Só mexe em contas com e-mail @verdant.test (e nas conversas/mensagens delas):
	  rodar de novo recria tudo do zero sem tocar em dados reais.
	- Recusa rodar com NODE_ENV=production.
	- Todos os perfis ficam em Belo Horizonte. Se o app atualizar sua localização para outro
	  lugar (ex.: GPS padrão do emulador), o feed fica vazio: ajuste o GPS ou rode o seed de novo.

	Login de teste: SEED_EMAIL / SEED_PASSWORD abaixo (vale também para os perfis fake,
	com o e-mail de cada um, ex.: ana.paula@verdant.test).
*/
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const SEED_EMAIL = 'voce@verdant.test';
const SEED_PASSWORD = 'verdant123';
const DOMAIN = '@verdant.test';
const URI = process.env.MONGO_URI || 'mongodb://localhost:27017/verdant';

// Savassi, Belo Horizonte: [longitude, latitude]
const CENTER = [-43.9345, -19.9386];

const { ObjectId } = mongoose.Types;

const PEOPLE = [
	// nome, gênero, idade, profissão, foto (randomuser: women|men/N)
	['Marina Yoshida', 'Female', 25, 'Estudante de medicina', 'women/44'],
	['Larissa Andrade', 'Female', 27, 'Designer de produto', 'women/65'],
	['Juliana Ribeiro', 'Female', 29, 'Arquiteta', 'women/68'],
	['Ana Paula Costa', 'Female', 31, 'Advogada', 'women/26'],
	['Letícia Moreira', 'Female', 24, 'Fotógrafa', 'women/90'],
	['Mayra Santos', 'Female', 28, 'Engenheira de software', 'women/33'],
	['Isabela Ferreira', 'Female', 26, 'Nutricionista', 'women/50'],
	['Camila Rocha', 'Female', 30, 'Professora de yoga', 'women/12'],
	['Beatriz Lima', 'Female', 23, 'Estudante de publicidade', 'women/79'],
	['Fernanda Alves', 'Female', 33, 'Médica veterinária', 'women/57'],
	['Natália Gomes', 'Female', 27, 'Chef de cozinha', 'women/21'],
	['Olívia Martins', 'Female', 29, 'Psicóloga', 'women/8'],
	['Lucas Oliveira', 'Male', 28, 'Desenvolvedor mobile', 'men/32'],
	['Rafael Souza', 'Male', 31, 'Músico', 'men/45'],
	['Gabriel Pereira', 'Male', 26, 'Engenheiro civil', 'men/22'],
	['Thiago Carvalho', 'Male', 30, 'Personal trainer', 'men/67'],
	['Pedro Henrique', 'Male', 24, 'Estudante de direito', 'men/11'],
	['Mateus Barbosa', 'Male', 33, 'Barista', 'men/76'],
	['Felipe Azevedo', 'Male', 29, 'Analista de dados', 'men/52'],
	['Bruno Teixeira', 'Male', 35, 'Cineasta', 'men/88'],
	['Diego Mendes', 'Male', 27, 'Ilustrador', 'men/3'],
	['Caio Nunes', 'Male', 25, 'Biólogo', 'men/60'],
	['Sam Duarte', 'Non-binary', 26, 'Tatuador', 'women/2'],
	['Alex Monteiro', 'Non-binary', 28, 'Produtor cultural', 'men/15'],
];

const BIOS = [
	'De volta do intercâmbio e pronta para novas aventuras! Amo viajar e experimentar comidas diferentes.',
	'Café, trilha no fim de semana e um bom livro. Me chama para conhecer um lugar novo em BH.',
	'Fã de pão de queijo, show ao vivo e conversa que vai até tarde.',
	'Procurando alguém para dividir a pizza e as séries.',
	'Corro na Lagoa da Pampulha de manhã e vivo de feira no sábado.',
	'Apaixonada por cachorros, praia e playlists bem montadas.',
	'Sempre com a câmera na mão. Me mostra seu bairro favorito?',
	'Gosto de cozinhar para os amigos e de descobrir botecos escondidos.',
];

const INTERESTS = [
	'Viagens', 'Música', 'Café', 'Trilhas', 'Cinema', 'Fotografia', 'Culinária', 'Yoga',
	'Games', 'Leitura', 'Pets', 'Corrida', 'Arte', 'Séries', 'Dança', 'Futebol',
];

const ABOUT = {
	education: ['Ensino superior', 'Pós-graduação', 'Mestrado'],
	drinking: ['Socialmente', 'Não bebo', 'Frequentemente'],
	smoking: ['Não fumo', 'Socialmente'],
	lookingFor: ['Relacionamento sério', 'Algo casual', 'Ainda descobrindo'],
	zodiacSign: ['Áries', 'Leão', 'Libra', 'Escorpião', 'Peixes', 'Gêmeos'],
};

// Pseudoaleatório com semente fixa: o seed gera sempre os mesmos dados
let state = 42;
const random = () => ((state = (state * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = list => list[Math.floor(random() * list.length)];
const pickMany = (list, count) => [...list].sort(() => random() - 0.5).slice(0, count);

const slug = name =>
	name
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/\s+/g, '.');

const birthDateFor = age => new Date(new Date().getFullYear() - age, Math.floor(random() * 12), 1 + Math.floor(random() * 27));

// Ponto aleatório até ~maxKm do centro
const nearby = maxKm => {
	const distance = (0.3 + random() * (maxKm - 0.3)) / 111;
	const angle = random() * 2 * Math.PI;
	return [CENTER[0] + distance * Math.cos(angle), CENTER[1] + distance * Math.sin(angle)];
};

const minutesAgo = minutes => new Date(Date.now() - minutes * 60_000);

// Conversas prontas: [índice do perfil, mensagens [de quem, texto, minutos atrás]]
const CHATS = [
	[0, [
		['them', 'Olá! 👋', 180],
		['them', 'O que acha de trocarmos algumas mensagens e ver se há alguma conexão real entre nós? Estou ansiosa para ouvir mais sobre você. 😄', 178],
		['me', 'Bora! Pra começar: que tipo de comida você mais gosta?', 120],
		['them', 'Japonesa, sem dúvida 🍣 E você?', 95],
	]],
	[1, [
		['them', 'Oi! Vi que temos interesses em comum, curte fotografia também?', 1500],
		['me', 'Curto demais! Tenho uma câmera analógica que vivo levando pra rua', 1490],
		['them', 'Que demais! Bora fazer um rolê fotográfico no Mercado Central?', 1480],
	]],
	[2, [
		['them', 'Gostaria de compartilhar algumas fotos da viagem que fiz, posso?', 2900],
		['me', 'Claro! Pra onde você foi?', 2880],
	]],
	[3, [
		['me', 'E aí? Notei que você também curte desenhar', 4400],
		['them', 'Curto sim! Faço uns rabiscos no caderno no intervalo do trabalho haha', 4300],
		['me', 'Vai fazer o quê na sexta?', 60],
	]],
];

async function run() {
	if (process.env.NODE_ENV === 'production') throw new Error('Seed bloqueado em produção');

	await mongoose.connect(URI);
	const db = mongoose.connection.db;
	const users = db.collection('users');
	const conversations = db.collection('conversations');
	const messages = db.collection('messages');

	// Limpa só o que o seed criou antes
	const old = await users.find({ email: { $regex: `${DOMAIN.replace('.', '\\.')}$` } }, { projection: { _id: 1 } }).toArray();
	const oldIds = old.map(user => user._id);
	if (oldIds.length) {
		const oldConversations = await conversations.find({ participants: { $in: oldIds } }, { projection: { _id: 1 } }).toArray();
		const oldConversationIds = oldConversations.map(conversation => conversation._id);
		await messages.deleteMany({ conversationId: { $in: oldConversationIds } });
		await conversations.deleteMany({ _id: { $in: oldConversationIds } });
		await users.deleteMany({ _id: { $in: oldIds } });
	}

	const password = await bcrypt.hash(SEED_PASSWORD, 10);
	const now = new Date();

	const base = () => ({
		premium: false,
		active: true,
		refreshToken: null,
		password,
		showMe: ['everyone'],
		languages: ['Português'],
		connectedAccounts: [],
		conversations: [],
		matches: [],
		likedProfiles: [],
		likedYouProfiles: [],
		passedProfiles: [],
		superLikedBy: [],
		superLikeHistory: [],
		blockedUsers: [],
		createdAt: now,
		__v: 0,
	});

	// Sua conta. Gênero fica em branco (defina no app/API se quiser); com showMe "everyone"
	// dos dois lados, o feed mostra todos os perfis.
	const me = {
		...base(),
		_id: new ObjectId(),
		email: SEED_EMAIL,
		username: 'voce',
		fullName: 'Bernardo Andrade',
		phoneNumber: '+5531999990000',
		birthDate: new Date('1997-06-15'),
		verified: true,
		location: { type: 'Point', coordinates: CENTER },
		profession: ['Desenvolvedor'],
		description: ['Testando o Verdant 🌿'],
		interests: ['Tecnologia', 'Música', 'Café'],
		photos: [],
		about: { lookingFor: 'Relacionamento sério' },
		preferences: { ageRange: [18, 60], distance: '50', advancedFilters: { verified: false } },
	};

	const fakes = PEOPLE.map(([fullName, gender, age, profession, photo], index) => ({
		...base(),
		_id: new ObjectId(),
		email: `${slug(fullName)}${DOMAIN}`,
		username: slug(fullName).replace('.', '_'),
		fullName,
		gender,
		phoneNumber: `+55319${String(80000000 + index).padStart(8, '0')}`,
		birthDate: birthDateFor(age),
		verified: random() < 0.5,
		location: { type: 'Point', coordinates: nearby(15) },
		profession: [profession],
		description: [pick(BIOS)],
		interests: pickMany(INTERESTS, 4),
		photos: [{ _id: new ObjectId(), url: `https://randomuser.me/api/portraits/${photo}.jpg`, uploadDate: now }],
		about: {
			height: 155 + Math.floor(random() * 35),
			education: pick(ABOUT.education),
			drinking: pick(ABOUT.drinking),
			smoking: pick(ABOUT.smoking),
			lookingFor: pick(ABOUT.lookingFor),
			zodiacSign: pick(ABOUT.zodiacSign),
		},
		preferences: { ageRange: [18, 60], distance: '50' },
	}));

	const conversationDocs = [];
	const messageDocs = [];

	const match = (other, chat = []) => {
		me.matches.push(other._id);
		other.matches.push(me._id);
		me.likedProfiles.push(other._id);
		other.likedProfiles.push(me._id);

		const conversationId = new ObjectId();
		const messageIds = chat.map(([from, content, ago]) => {
			const sentAt = minutesAgo(ago);
			const doc = {
				_id: new ObjectId(),
				sender: from === 'me' ? me._id : other._id,
				content,
				conversationId,
				sentAt,
				// Mensagens antigas já lidas; a mais recente de cada conversa fica não lida
				readAt: ago > 100 ? sentAt : null,
				__v: 0,
			};
			messageDocs.push(doc);
			return doc._id;
		});
		const oldest = chat.length ? Math.max(...chat.map(([, , ago]) => ago)) + 30 : 20;
		conversationDocs.push({
			_id: conversationId,
			participants: [me._id, other._id],
			messages: messageIds,
			startedAt: minutesAgo(oldest),
			isActive: true,
			__v: 0,
		});
		me.conversations.push(conversationId);
		other.conversations.push(conversationId);
	};

	// 4 matches com conversa, 3 matches novos (sem mensagem)
	for (const [index, chat] of CHATS) match(fakes[index], chat);
	for (const index of [4, 5, 12]) match(fakes[index]);

	// 4 perfis que já curtiram você: aparecem no feed e viram match ao curtir de volta
	for (const index of [6, 7, 13, 22]) {
		fakes[index].likedProfiles.push(me._id);
		me.likedYouProfiles.push(fakes[index]._id);
	}

	await users.insertMany([me, ...fakes]);
	await conversations.insertMany(conversationDocs);
	if (messageDocs.length) await messages.insertMany(messageDocs);

	console.log(`Seed ok em ${URI.replace(/\/\/[^@/]*@/, "//***@")}`);
	console.log(`- ${fakes.length + 1} usuários (${fakes.length} fake), ${conversationDocs.length} conversas, ${messageDocs.length} mensagens`);
	console.log(`- Login: ${SEED_EMAIL} (senha em scripts/seed.js)`);

	await mongoose.disconnect();
}

run().catch(async error => {
	console.error(error);
	await mongoose.disconnect();
	process.exit(1);
});
