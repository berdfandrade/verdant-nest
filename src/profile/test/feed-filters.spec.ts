import { advancedFilterConditions, genderConditions, showMeKeyForGender } from '../feed-filters';

describe('🎯 feed filters (query builders)', () => {
	describe('👥 genderConditions', () => {
		it('should restrict candidates to the genders in my showMe', () => {
			const [genderFilter] = genderConditions({ gender: 'Male', showMe: ['women'] });
			expect(genderFilter.gender.$in.map((r: RegExp) => r.source)).toEqual(['^Female$']);
		});

		it('should not restrict gender when I want to see everyone', () => {
			const conditions = genderConditions({ gender: 'Male', showMe: ['everyone'] });
			expect(conditions.some(c => 'gender' in c)).toBe(false);
		});

		it('should not restrict gender when showMe is empty', () => {
			const conditions = genderConditions({ gender: 'Male', showMe: [] });
			expect(conditions.some(c => 'gender' in c)).toBe(false);
		});

		it('should always require the candidate to accept my gender (mutual)', () => {
			const conditions = genderConditions({ gender: 'Male', showMe: ['women'] });
			const mutual = conditions.find(c => '$or' in c)!;
			const accepted = mutual.$or.map((c: any) => c.showMe?.source).filter(Boolean);
			expect(accepted).toEqual(expect.arrayContaining(['^everyone$', '^men$']));
		});

		it('should ignore unknown showMe values instead of emptying the feed', () => {
			const conditions = genderConditions({ gender: 'Male', showMe: ['aliens'] });
			expect(conditions.some(c => 'gender' in c)).toBe(false);
		});
	});

	describe('🔁 showMeKeyForGender', () => {
		it('should map a gender to its showMe value (case insensitive)', () => {
			expect(showMeKeyForGender('female')).toBe('women');
			expect(showMeKeyForGender('Non-binary')).toBe('non-binary');
			expect(showMeKeyForGender(undefined)).toBeUndefined();
		});
	});

	describe('⚙️ advancedFilterConditions', () => {
		it('should return an empty query without filters', () => {
			expect(advancedFilterConditions(undefined)).toEqual({});
			expect(advancedFilterConditions({ education: [], verified: false })).toEqual({});
		});

		it('should build height range and verified filters', () => {
			const query = advancedFilterConditions({ verified: true, height: [170, 190] });
			expect(query).toEqual({ verified: true, 'about.height': { $gte: 170, $lte: 190 } });
		});

		it('should match education by "contains" and other fields exactly', () => {
			const query = advancedFilterConditions({ education: ['Bachelor'], religion: ['Spiritual'] });

			expect(query['about.education'].$in[0].test('Bachelor in Design')).toBe(true);
			expect(query['about.religion'].$in[0].test('spiritual')).toBe(true);
			expect(query['about.religion'].$in[0].test('Spiritual but not religious')).toBe(false);
		});

		it('should escape regex characters from user input', () => {
			const query = advancedFilterConditions({ religion: ['.*'] });
			expect(query['about.religion'].$in[0].test('Buddhist')).toBe(false);
		});
	});
});
