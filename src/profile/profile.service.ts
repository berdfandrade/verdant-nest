import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { User, UserModel, USER_PRIVATE_FIELDS } from '@/user/user.schema';
import { UpdatePreferencesDto } from '@/user/dto/update-preferences.dto';
import { UpdateAboutDto } from '@/user/dto/update-about.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { advancedFilterConditions, genderConditions } from './feed-filters';
import { fullNameRegex, usernameRegex } from './name-search';
import { RedisService } from '@/redis/redis.service';
import { onlineKey } from '@/chat/presence';

/*
    ProfileService:
    Responsável por tudo que envolve como o usuário interage com seu próprio perfil.
    Exibe perfis, configurações, atualizações de preferências, denúncia, etc.
*/

export const DEFAULT_DISTANCE_KM = 10;
export const FEED_LIMIT = 50;
export const SEARCH_LIMIT = 30;
// Quantos nomes a busca lê antes do filtro "online" (que só dá para aplicar depois, no Redis)
const SEARCH_SCAN_LIMIT = 100;

// Campos que nunca devem sair no feed (dados privados ou listas internas)
const FEED_HIDDEN_FIELDS = [
	...USER_PRIVATE_FIELDS,
	'email',
	'phoneNumber',
	'likedProfiles',
	'likedYouProfiles',
	'passedProfiles',
	'blockedUsers',
	'matches',
	'conversations',
	'connectedAccounts',
	'preferences',
];

// Converte um intervalo de idade em intervalo de datas de nascimento
export function birthDateRangeFromAges(minAge?: number, maxAge?: number, now = new Date()) {
	const range: { $lte?: Date; $gt?: Date } = {};

	if (typeof minAge === 'number') {
		const latest = new Date(now);
		latest.setFullYear(latest.getFullYear() - minAge);
		range.$lte = latest;
	}

	if (typeof maxAge === 'number') {
		const earliest = new Date(now);
		earliest.setFullYear(earliest.getFullYear() - maxAge - 1);
		range.$gt = earliest;
	}

	return range;
}

@Injectable()
export class ProfileService {
	constructor(
		@InjectModel(User.name) private userModel: UserModel,
		private readonly redisService: RedisService,
	) {}

	async showMeProfiles(myProfileId: Types.ObjectId | string) {
		const myProfile = await this.userModel.findById(myProfileId);

		if (!myProfile) throw new NotFoundException('Profile not found');
		if (!myProfile.location?.coordinates?.length)
			throw new NotFoundException('User location not found');

		const [longitude, latitude] = myProfile.location.coordinates;

		if (typeof longitude !== 'number' || typeof latitude !== 'number') {
			throw new BadRequestException('Invalid user coordinates');
		}

		// distance pode vir como "50" ou "50km"
		const parsedDistance = parseFloat(myProfile.preferences?.distance ?? '');
		const distanceInKm = Number.isFinite(parsedDistance) ? parsedDistance : DEFAULT_DISTANCE_KM;
		const maxDistance = distanceInKm * 1000; // convert to meters

		// Não mostra: eu mesmo, quem eu já curti, passei, dei match ou bloqueei
		const excludedIds = [
			myProfile._id,
			...(myProfile.likedProfiles ?? []),
			...(myProfile.passedProfiles ?? []),
			...(myProfile.matches ?? []),
			...(myProfile.blockedUsers ?? []),
		];

		const query: Record<string, any> = {
			_id: { $nin: excludedIds },
			active: true,
			// ...nem quem me bloqueou
			blockedUsers: { $ne: myProfile._id },
		};

		const [minAge, maxAge] = myProfile.preferences?.ageRange ?? [];
		const birthDateRange = birthDateRangeFromAges(minAge, maxAge);
		if (Object.keys(birthDateRange).length) query.birthDate = birthDateRange;

		// Gênero (mútuo, para todos)
		const andConditions = genderConditions(myProfile);

		// Filtros avançados: rígidos, só para premium
		if (myProfile.premium) {
			Object.assign(query, advancedFilterConditions(myProfile.preferences?.advancedFilters));
		}

		if (andConditions.length) query.$and = andConditions;

		const nearbyUsers = await this.userModel.aggregate([
			{
				$geoNear: {
					near: {
						type: 'Point',
						coordinates: [longitude, latitude],
					},
					distanceField: 'distance',
					spherical: true,
					maxDistance: maxDistance,
					query,
				},
			},
			{
				$limit: FEED_LIMIT,
			},
			{
				$project: Object.fromEntries(FEED_HIDDEN_FIELDS.map(field => [field, 0])),
			},
		]);

		return nearbyUsers;
	}

	/*
		Busca por nome (Figma: 08 · Pesquisar). Diferente do feed, acha também quem eu já curti,
		passei ou dei match, sem limite de distância. Mantém o que protege as pessoas:
		ninguém bloqueado (nos dois sentidos), só contas ativas e o filtro de gênero mútuo.
		Com localização, ordena do mais perto ao mais longe; sem ela, por nome.
	*/
	async searchByName(myProfileId: Types.ObjectId | string, term: string, { onlineOnly = false } = {}) {
		const me = await this.userModel.findById(myProfileId);
		if (!me) throw new NotFoundException('Profile not found');

		const query: Record<string, any> = {
			_id: { $nin: [me._id, ...(me.blockedUsers ?? [])] },
			active: true,
			blockedUsers: { $ne: me._id },
			$and: [
				...genderConditions(me),
				{ $or: [{ fullName: fullNameRegex(term) }, { username: usernameRegex(term) }] },
			],
		};
		const hide = { $project: Object.fromEntries(FEED_HIDDEN_FIELDS.map(field => [field, 0])) };

		const [longitude, latitude] = me.location?.coordinates ?? [];
		const hasLocation = typeof longitude === 'number' && typeof latitude === 'number';

		const candidates = hasLocation
			? await this.userModel.aggregate([
					{
						$geoNear: {
							near: { type: 'Point', coordinates: [longitude, latitude] },
							distanceField: 'distance',
							spherical: true,
							query,
						},
					},
					{ $limit: SEARCH_SCAN_LIMIT },
					hide,
				])
			: await this.userModel.aggregate([{ $match: query }, { $sort: { fullName: 1 } }, { $limit: SEARCH_SCAN_LIMIT }, hide]);

		const presence = await this.redisService.getKeys(candidates.map(candidate => onlineKey(String(candidate._id))));
		const myMatches = new Set((me.matches ?? []).map(String));

		const results = candidates.map((candidate, index) => ({
			...candidate,
			online: presence[index] !== null,
			isMatch: myMatches.has(String(candidate._id)),
		}));

		return (onlineOnly ? results.filter(result => result.online) : results).slice(0, SEARCH_LIMIT);
	}

	async showMeMyPreferences(myProfileId: Types.ObjectId | string) {
		const myProfile = await this.userModel.findById(myProfileId);
		if (!myProfile) throw new NotFoundException('Profile not found');
		return myProfile.preferences;
	}

	async changeMyConfigs(myProfileId: Types.ObjectId | string, preferences: UpdatePreferencesDto) {
		const myProfile = await this.userModel.findById(myProfileId);
		if (!myProfile) throw new NotFoundException('Profile not found');

		const current = myProfile.toObject().preferences ?? {};

		myProfile.preferences = {
			...current,
			...preferences,
			advancedFilters: {
				...current.advancedFilters,
				...preferences.advancedFilters,
			},
		};

		await myProfile.save();
		return { message: 'Preferences updated successfully' };
	}

	async showMeAboutMe(myProfileId: Types.ObjectId | string) {
		const myProfile = await this.userModel.findById(myProfileId);
		if (!myProfile) throw new NotFoundException('Profile not found');
		return myProfile.about;
	}

	async changeAboutMe(myProfileId: Types.ObjectId | string, about: UpdateAboutDto) {
		const myProfile = await this.userModel.findById(myProfileId);
		if (!myProfile) throw new NotFoundException('Profile not found');

		myProfile.about = {
			...(myProfile.toObject().about ?? {}),
			...about,
		};

		await myProfile.save();
		return { message: 'About updated successfully' };
	}

	async updateLocation(myProfileId: Types.ObjectId | string, { longitude, latitude }: UpdateLocationDto) {
		const updated = await this.userModel.findByIdAndUpdate(
			myProfileId,
			{ location: { type: 'Point', coordinates: [longitude, latitude] } },
			{ new: true },
		);
		if (!updated) throw new NotFoundException('Profile not found');
		return { message: 'Location updated successfully', location: updated.location };
	}
}
