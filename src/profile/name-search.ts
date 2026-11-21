/*
	Busca por nome que ignora maiúsculas e acentos e casa no começo de qualquer palavra:
	"leti" acha "Letícia Moreira", "and" acha "Larissa Andrade", mas "issa" não acha "Larissa".
*/

// Letras com variações acentuadas (minúsculas e maiúsculas: o "i" do Mongo não cobre acentos de forma garantida)
const VARIANTS: Record<string, string> = {
	a: 'aáàâãäAÁÀÂÃÄ',
	e: 'eéèêëEÉÈÊË',
	i: 'iíìîïIÍÌÎÏ',
	o: 'oóòôõöOÓÒÔÕÖ',
	u: 'uúùûüUÚÙÛÜ',
	c: 'cçCÇ',
	n: 'nñNÑ',
};

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Termo sem acentos, em minúsculas e com espaços simples
export function normalizeSearchTerm(term: string): string {
	return term
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.trim()
		.replace(/\s+/g, ' ');
}

function termPattern(term: string): string {
	return [...normalizeSearchTerm(term)]
		.map(char => {
			if (char === ' ') return '\\s+';
			return VARIANTS[char] ? `[${VARIANTS[char]}]` : escapeRegex(char);
		})
		.join('');
}

// fullName: começo do nome ou de qualquer palavra
export function fullNameRegex(term: string): RegExp {
	return new RegExp(`(^|\\s)${termPattern(term)}`, 'i');
}

// username: só o começo
export function usernameRegex(term: string): RegExp {
	return new RegExp(`^${termPattern(term)}`, 'i');
}
