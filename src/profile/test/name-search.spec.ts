import { fullNameRegex, normalizeSearchTerm, usernameRegex } from '@/profile/name-search';

describe('🔎 name search', () => {
	it('should normalize accents, case and spaces', () => {
		expect(normalizeSearchTerm('  LetÍcia   Moreira ')).toBe('leticia moreira');
	});

	it('should match the start of any word, ignoring case and accents', () => {
		expect(fullNameRegex('leti').test('Letícia Moreira')).toBe(true);
		expect(fullNameRegex('LETÍ').test('Leticia Moreira')).toBe(true);
		expect(fullNameRegex('and').test('Larissa Andrade')).toBe(true);
		expect(fullNameRegex('larissa and').test('Larissa  Andrade')).toBe(true);
	});

	it('should not match in the middle of a word', () => {
		expect(fullNameRegex('issa').test('Larissa Andrade')).toBe(false);
	});

	it('should treat regex characters as text', () => {
		expect(fullNameRegex('a.c').test('abc')).toBe(false);
		expect(fullNameRegex('(').test('(')).toBe(true);
	});

	it('should match usernames only from the start', () => {
		expect(usernameRegex('mar').test('maria_artsy')).toBe(true);
		expect(usernameRegex('artsy').test('maria_artsy')).toBe(false);
	});
});
