import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { FilterQuery, Model, Types } from "mongoose";
import { User } from "@/user/user.schema";
import MongoDbUtils from "@/utils/MongoDB.utils";
import {
  ACTIVE_DATE_STATUSES,
  DateInvite,
  DateStatus,
} from "./date-invite.schema";
import { CreateDateInviteDto, ListDatesQueryDto } from "./dto/date-invite.dto";

type Id = Types.ObjectId | string;

// O que a tela mostra de cada participante (nome e foto)
const PARTICIPANT_FIELDS = "fullName username photos";
const POPULATE_PARTICIPANTS = [
  { path: "inviter", select: PARTICIPANT_FIELDS },
  { path: "invitee", select: PARTICIPANT_FIELDS },
];

/*
	Regra de cada ação: quem pode fazer e de quais status ela parte.
	- aceitar/recusar: só quem foi convidado, e só um convite pendente
	- cancelar: qualquer um dos dois, enquanto o date estiver de pé
*/
const TRANSITIONS = {
  accept: { by: "invitee", from: ["pending"], to: "accepted" },
  decline: { by: "invitee", from: ["pending"], to: "declined" },
  cancel: { by: "participant", from: ACTIVE_DATE_STATUSES, to: "canceled" },
} as const satisfies Record<
  string,
  { by: "invitee" | "participant"; from: readonly DateStatus[]; to: DateStatus }
>;

export type DateAction = keyof typeof TRANSITIONS;

@Injectable()
export class DatesService {
  constructor(
    @InjectModel(DateInvite.name) private readonly dateModel: Model<DateInvite>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  // Convida um match para um date ("Marcar encontro" no chat)
  async invite(
    myId: Id,
    { inviteeId, place, scheduledAt }: CreateDateInviteDto,
  ) {
    const inviter = MongoDbUtils.toObjectId(myId);
    const invitee = MongoDbUtils.toObjectId(inviteeId);
    const when = new Date(scheduledAt);

    if (inviter.equals(invitee))
      throw new BadRequestException("You can not invite yourself");
    if (when.getTime() <= Date.now())
      throw new BadRequestException("The date must be in the future");

    // Bloquear desfaz o match, então isso também barra quem está bloqueado
    const isMatch = await this.userModel.exists({
      _id: inviter,
      matches: invitee,
    });
    if (!isMatch)
      throw new ForbiddenException("You can only invite your matches");

    // Um convite pendente por casal: evita convites repetidos enquanto ninguém responde
    const pending = await this.dateModel.exists({
      ...this.betweenFilter(inviter, invitee),
      status: "pending",
    });
    if (pending)
      throw new ConflictException(
        "There is already a pending invite between you two",
      );

    const date = await this.dateModel.create({
      inviter,
      invitee,
      place,
      scheduledAt: when,
    });
    return date.populate(POPULATE_PARTICIPANTS);
  }

  // "Meus dates" e calendário: dates de pé (pendentes ou aceitos) no intervalo
  async list(myId: Id, { from, to }: ListDatesQueryDto = {}) {
    const me = MongoDbUtils.toObjectId(myId);
    const scheduledAt: { $gte: Date; $lte?: Date } = {
      $gte: from ? new Date(from) : new Date(),
    };
    if (to) scheduledAt.$lte = new Date(to);

    return this.dateModel
      .find({
        ...this.participantFilter(me),
        status: { $in: ACTIVE_DATE_STATUSES },
        scheduledAt,
      })
      .sort({ scheduledAt: 1 })
      .populate(POPULATE_PARTICIPANTS);
  }

  // Convites recebidos esperando resposta ("Juliana te convidou para um date!")
  async receivedInvites(myId: Id) {
    return this.dateModel
      .find({
        invitee: MongoDbUtils.toObjectId(myId),
        status: "pending",
        scheduledAt: { $gt: new Date() },
      })
      .sort({ scheduledAt: 1 })
      .populate(POPULATE_PARTICIPANTS);
  }

  async findOne(myId: Id, dateId: Id) {
    const date = await this.dateModel
      .findOne({
        _id: MongoDbUtils.toObjectId(dateId),
        ...this.participantFilter(myId),
      })
      .populate(POPULATE_PARTICIPANTS);
    if (!date) throw new NotFoundException("Date not found");
    return date;
  }

  accept(myId: Id, dateId: Id) {
    return this.transition("accept", myId, dateId);
  }

  decline(myId: Id, dateId: Id) {
    return this.transition("decline", myId, dateId);
  }

  cancel(myId: Id, dateId: Id) {
    return this.transition("cancel", myId, dateId);
  }

  /*
		Muda o status com um update condicional (status e papel no filtro):
		duas respostas ao mesmo tempo nunca sobrescrevem uma à outra.
		Se nada mudar, descobre o motivo para responder o erro certo.
	*/
  private async transition(action: DateAction, myId: Id, dateId: Id) {
    const { by, from, to } = TRANSITIONS[action];
    const me = MongoDbUtils.toObjectId(myId);
    const _id = MongoDbUtils.toObjectId(dateId);
    const roleFilter =
      by === "invitee" ? { invitee: me } : this.participantFilter(me);
    // Não dá para aceitar um date que já passou
    const timeFilter =
      action === "accept" ? { scheduledAt: { $gt: new Date() } } : {};

    const updated = await this.dateModel
      .findOneAndUpdate(
        { _id, ...roleFilter, ...timeFilter, status: { $in: from } },
        { status: to, respondedAt: new Date() },
        { new: true },
      )
      .populate(POPULATE_PARTICIPANTS);
    if (updated) return updated;

    const date = await this.dateModel.findOne({
      _id,
      ...this.participantFilter(me),
    });
    if (!date) throw new NotFoundException("Date not found");
    if (by === "invitee" && !date.invitee.equals(me)) {
      throw new ForbiddenException(
        "Only the invited person can answer this invite",
      );
    }
    if (!(from as readonly DateStatus[]).includes(date.status)) {
      throw new ConflictException(`This date is already ${date.status}`);
    }
    throw new ConflictException("This date has already passed");
  }

  private participantFilter(myId: Id): FilterQuery<DateInvite> {
    const me = MongoDbUtils.toObjectId(myId);
    return { $or: [{ inviter: me }, { invitee: me }] };
  }

  private betweenFilter(
    a: Types.ObjectId,
    b: Types.ObjectId,
  ): FilterQuery<DateInvite> {
    return {
      $or: [
        { inviter: a, invitee: b },
        { inviter: b, invitee: a },
      ],
    };
  }
}
