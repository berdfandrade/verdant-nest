import { Model } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';


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

  @Prop({
    type: {
      type: String,
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
    },
  })
  location: {
    type: string;
    coordinates: number[];
  };

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

  @Prop({ type: [Types.ObjectId], ref: 'Conversation' })
  conversations: Types.ObjectId[];

  @Prop([String])
  connectedAccounts: string[];

  @Prop([String])
  interests: string[];

  @Prop({ type: [Types.ObjectId], ref: 'User' })
  matches: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], ref: 'User' })
  likedProfiles: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], ref: 'User' })
  likedYouProfiles: Types.ObjectId[];

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
