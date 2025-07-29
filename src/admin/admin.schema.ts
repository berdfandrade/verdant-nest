import { HydratedDocument, Model } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { IsEmail } from "class-validator";

export type AdminDocument = HydratedDocument<Admin>;

@Schema({ collection: 'admin' })
export class Admin extends Document {
  @Prop()
  name: string;

  @Prop()
  @IsEmail()
  email: string;

  @Prop()
  password: string;

  @Prop()
  photoUrl: string;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);
