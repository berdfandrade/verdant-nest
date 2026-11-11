import { Model } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

// Ponto GeoJSON: [longitude, latitude]
@Schema({ _id: false })
export class GeoPoint {
	@Prop({ type: String, enum: ['Point'], default: 'Point', required: true })
	type: 'Point';

	@Prop({ type: [Number], required: true })
	coordinates: [number, number];
}

export const GeoPointSchema = SchemaFactory.createForClass(GeoPoint);

export interface UserModel extends Model<User> {
	showNearbyUsers(profile: User, maxDistanceKm: number): Promise<User[]>;
}

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: false } })
export class User extends Document {
	@Prop({ default: false })
	premium: boolean;

	@Prop({ default: true })
	active: boolean;

	@Prop({ default: false })
	verified: boolean;

	@Prop({ type: String, default: null })
	refreshToken?: string | null;

	@Prop()
	username: string;

	@Prop({ required: true, unique: true })
	email: string;

	@Prop({ required: true })
	password: string;

	@Prop({ required: true })
	fullName: string;

	@Prop({ required: true })
	phoneNumber: string;

	@Prop({ required: true })
	birthDate: Date;

	/*
		Gênero ("Female", "Male", "Non-binary"...). Obrigatório no cadastro (CreateUserDto),
		mas opcional aqui para não invalidar documentos antigos, salvos antes deste campo existir.
	*/
	@Prop()
	gender?: string;

	/*
		Opcional: o usuário pode se cadastrar sem localização e enviá-la depois
		(PUT /profile/location). Quando existe, precisa ser um Point válido.
	*/
	@Prop({ type: GeoPointSchema, default: undefined })
	location?: GeoPoint;

	@Prop([String])
	profession: string[];

	@Prop([String])
	showMe: string[];

	@Prop([String])
	description: string[];

	@Prop([
		{
			url: String,
			uploadDate: { type: Date, default: Date.now },
		},
	])
	photos: { url: string; uploadDate: Date }[];

	@Prop({
		type: {
			height: Number,
			physicalExercise: String,
			education: String,
			drinking: String,
			smoking: String,
			lookingFor: String,
			children: String,
			zodiacSign: String,
			politics: String,
			religion: String,
		},
	})
	about: {
		height?: number;
		physicalExercise?: string;
		education?: string;
		drinking?: string;
		smoking?: string;
		lookingFor?: string;
		children?: string;
		zodiacSign?: string;
		politics?: string;
		religion?: string;
	};

	@Prop([String])
	languages: string[];

	@Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Conversation' }] })
	conversations: Types.ObjectId[];

	@Prop([String])
	connectedAccounts: string[];

	@Prop([String])
	interests: string[];

	@Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }] })
	matches: Types.ObjectId[];

	@Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }] })
	likedProfiles: Types.ObjectId[];

	@Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }] })
	likedYouProfiles: Types.ObjectId[];

	// Perfis que o usuário "passou" (deslizou para o lado) e não devem voltar no feed
	@Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], default: [] })
	passedProfiles: Types.ObjectId[];

	@Prop({
		type: {
			ageRange: [Number],
			distance: String,
			advancedFilters: {
				verified: { type: Boolean, default: false },
				height: [Number],
				education: [String],
				alcohol: [String],
				smoking: [String],
				children: [String],
				zodiacSign: [String],
				politicalView: [String],
				religion: [String],
			},
		},
	})
	preferences: {
		ageRange?: number[];
		distance?: string;
		advancedFilters?: {
			verified?: boolean;
			height?: number[];
			education?: string[];
			alcohol?: string[];
			smoking?: string[];
			children?: string[];
			zodiacSign?: string[];
			politicalView?: string[];
			religion?: string[];
		};
	};
}

export const UserSchema = SchemaFactory.createForClass(User);

// Campos sensíveis nunca saem na resposta da API
export const USER_PRIVATE_FIELDS = ['password', 'refreshToken', '__v'] as const;

UserSchema.set('toJSON', {
	transform: (_doc, ret: Record<string, any>) => {
		for (const field of USER_PRIVATE_FIELDS) delete ret[field];
		return ret;
	},
});

// Índice geoespacial necessário para $geoNear
UserSchema.index({ location: '2dsphere' });
