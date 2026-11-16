import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema, Types } from "mongoose";

/*
	Ciclo de vida de um date:
	pending ──aceitar──▶ accepted ──cancelar──▶ canceled
	   │ └────recusar──▶ declined
	   └──────cancelar──▶ canceled
*/
export const DATE_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "canceled",
] as const;
export type DateStatus = (typeof DATE_STATUSES)[number];

// Dates que ainda estão de pé (aparecem no calendário e em "Meus dates")
export const ACTIVE_DATE_STATUSES: DateStatus[] = ["pending", "accepted"];

@Schema({ _id: false })
export class DatePlace {
  @Prop({ required: true, trim: true, maxlength: 120 })
  name: string;

  @Prop({ trim: true, maxlength: 200 })
  address?: string;
}

export const DatePlaceSchema = SchemaFactory.createForClass(DatePlace);

@Schema({ timestamps: true })
export class DateInvite extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", required: true })
  inviter: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", required: true })
  invitee: Types.ObjectId;

  @Prop({ type: DatePlaceSchema, required: true })
  place: DatePlace;

  @Prop({ required: true })
  scheduledAt: Date;

  @Prop({ type: String, enum: DATE_STATUSES, default: "pending" })
  status: DateStatus;

  // Quando o convite foi aceito, recusado ou cancelado
  @Prop({ type: Date })
  respondedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const DateInviteSchema = SchemaFactory.createForClass(DateInvite);

// "Meus dates" e calendário: dates de cada participante por data
DateInviteSchema.index({ inviter: 1, scheduledAt: 1 });
DateInviteSchema.index({ invitee: 1, status: 1, scheduledAt: 1 });
