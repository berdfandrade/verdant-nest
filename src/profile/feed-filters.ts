/*
	Filtros do feed (montam pedaços da query do MongoDB).

	- showMe/gender: vale para todos e é MÚTUO. Eu só vejo quem tem um gênero
	  que eu quero ver, e que também quer ver alguém do meu gênero.
	- advancedFilters: rígidos (quem não bate sai do feed), mas só para premium.
*/

export type FeedQuery = Record<string, any>;

// Valores de `showMe` -> valor de `gender` correspondente
export const SHOW_ME_TO_GENDER: Record<string, string> = {
	women: 'Female',
	men: 'Male',
	'non-binary': 'Non-binary',
};

export const SHOW_ME_EVERYONE = 'everyone';

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exactInsensitive = (value: string) => new RegExp(`^${escapeRegex(value.trim())}$`, 'i');
const containsInsensitive = (value: string) => new RegExp(escapeRegex(value.trim()), 'i');

const normalize = (values?: string[] | null) =>
	(values ?? []).map(value => value?.trim().toLowerCase()).filter(Boolean);

// Valor de `showMe` que corresponde a um gênero (inverso do mapa acima)
export function showMeKeyForGender(gender?: string | null): string | undefined {
	if (!gender) return undefined;
	const target = gender.trim().toLowerCase();
	return Object.keys(SHOW_ME_TO_GENDER).find(key => SHOW_ME_TO_GENDER[key].toLowerCase() === target);
}

/*
	Monta as condições de gênero:
	1. O gênero do candidato está no meu showMe (se eu não restrinjo, qualquer um)
	2. O showMe do candidato inclui meu gênero, ou ele não restringe
*/
export function genderConditions(me: { gender?: string | null; showMe?: string[] | null }): FeedQuery[] {
	const conditions: FeedQuery[] = [];

	const myShowMe = normalize(me.showMe);
	const wantsEveryone = myShowMe.length === 0 || myShowMe.includes(SHOW_ME_EVERYONE);

	if (!wantsEveryone) {
		const genders = myShowMe.map(key => SHOW_ME_TO_GENDER[key]).filter(Boolean);
		// showMe só com valores desconhecidos: não restringe (evita feed vazio por dado inválido)
		if (genders.length) conditions.push({ gender: { $in: genders.map(exactInsensitive) } });
	}

	const candidateAcceptsMe: FeedQuery[] = [
		{ showMe: { $exists: false } },
		{ showMe: { $size: 0 } },
		{ showMe: exactInsensitive(SHOW_ME_EVERYONE) },
	];
	const myKey = showMeKeyForGender(me.gender);
	if (myKey) candidateAcceptsMe.push({ showMe: exactInsensitive(myKey) });

	conditions.push({ $or: candidateAcceptsMe });

	return conditions;
}

export interface AdvancedFilters {
	verified?: boolean;
	height?: number[];
	education?: string[];
	alcohol?: string[];
	smoking?: string[];
	children?: string[];
	zodiacSign?: string[];
	politicalView?: string[];
	religion?: string[];
}

// Filtro de lista -> campo em `about` e tipo de comparação
const LIST_FILTERS: { filter: keyof AdvancedFilters; field: string; match: 'exact' | 'contains' }[] = [
	// "Bachelor" deve casar com "Bachelor in Design"
	{ filter: 'education', field: 'about.education', match: 'contains' },
	{ filter: 'alcohol', field: 'about.drinking', match: 'exact' },
	{ filter: 'smoking', field: 'about.smoking', match: 'exact' },
	{ filter: 'children', field: 'about.children', match: 'exact' },
	{ filter: 'zodiacSign', field: 'about.zodiacSign', match: 'exact' },
	{ filter: 'politicalView', field: 'about.politics', match: 'exact' },
	{ filter: 'religion', field: 'about.religion', match: 'exact' },
];

/*
	Condições dos filtros avançados. Listas vazias são ignoradas.
	Rígido: quem não tem o campo preenchido também sai (não dá para saber se bate).
*/
export function advancedFilterConditions(filters?: AdvancedFilters | null): FeedQuery {
	const query: FeedQuery = {};
	if (!filters) return query;

	if (filters.verified) query.verified = true;

	const [minHeight, maxHeight] = filters.height ?? [];
	if (typeof minHeight === 'number' || typeof maxHeight === 'number') {
		query['about.height'] = {
			...(typeof minHeight === 'number' ? { $gte: minHeight } : {}),
			...(typeof maxHeight === 'number' ? { $lte: maxHeight } : {}),
		};
	}

	for (const { filter, field, match } of LIST_FILTERS) {
		const values = (filters[filter] as string[] | undefined)?.filter(value => value?.trim());
		if (!values?.length) continue;
		query[field] = { $in: values.map(match === 'contains' ? containsInsensitive : exactInsensitive) };
	}

	return query;
}
