import mongoose, { Model } from "mongoose";
import { getModelToken } from "@nestjs/mongoose";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  INestApplication,
  NotFoundException,
} from "@nestjs/common";
import { MongoMemoryServer } from "mongodb-memory-server";
import { SetupTestApp } from "@test/test-setup";
import { User } from "@/user/user.schema";
import { UserService } from "@/user/user.service";
import { LikesService } from "@/likes/likes.service";
import { SafetyService } from "@/safety/safety.service";
import { mockUser, mockUserMaria } from "@/user/test/mock/user.mock";
import { DatesService } from "../dates.service";
import { DateInvite } from "../date-invite.schema";

let app: INestApplication;
let mongoServer: MongoMemoryServer;
let datesService: DatesService;
let userService: UserService;
let likesService: LikesService;
let safetyService: SafetyService;
let userModel: Model<User>;
let dateModel: Model<DateInvite>;

const DAY_MS = 24 * 60 * 60 * 1000;
const inDays = (days: number) => new Date(Date.now() + days * DAY_MS);

const PLACE = { name: "Brewteco Leblon", address: "R. Dias Ferreira, 420" };

beforeAll(async () => {
  const {
    app: testApp,
    moduleFixture,
    mongoServer: server,
  } = await SetupTestApp();

  app = testApp;
  mongoServer = server;
  datesService = moduleFixture.get(DatesService);
  userService = moduleFixture.get(UserService);
  likesService = moduleFixture.get(LikesService);
  safetyService = moduleFixture.get(SafetyService);
  userModel = moduleFixture.get(getModelToken(User.name));
  dateModel = moduleFixture.get(getModelToken(DateInvite.name));
});

beforeEach(async () => {
  await userModel.deleteMany({});
  await dateModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  await app.close();
});

// Bernardo e Maria com match
const createMatch = async () => {
  const bernardo = await userService.create(mockUser);
  const maria = await userService.create(mockUserMaria);
  await likesService.likeProfile({
    myProfileId: bernardo.id,
    profileToBeLikedId: maria.id,
  });
  await likesService.likeProfile({
    myProfileId: maria.id,
    profileToBeLikedId: bernardo.id,
  });
  return { bernardo, maria };
};

// Bernardo convida a Maria
const createInvite = async (scheduledAt = inDays(5)) => {
  const users = await createMatch();
  const date = await datesService.invite(users.bernardo.id, {
    inviteeId: users.maria.id,
    place: PLACE,
    scheduledAt: scheduledAt.toISOString(),
  });
  return { ...users, date: date! };
};

describe("📅 DatesService", () => {
  describe("💌 invite", () => {
    it("should create a pending invite with both participants populated", async () => {
      const { bernardo, maria, date } = await createInvite();

      expect(date.status).toBe("pending");
      expect(date.place).toMatchObject(PLACE);
      expect((date.inviter as any).fullName).toBe(bernardo.fullName);
      expect((date.invitee as any).fullName).toBe(maria.fullName);
      // Só dados públicos dos participantes
      expect((date.invitee as any).email).toBeUndefined();
    });

    it("should only allow inviting a match", async () => {
      const bernardo = await userService.create(mockUser);
      const maria = await userService.create(mockUserMaria);

      await expect(
        datesService.invite(bernardo.id, {
          inviteeId: maria.id,
          place: PLACE,
          scheduledAt: inDays(1).toISOString(),
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should not allow inviting someone after blocking (the match is gone)", async () => {
      const { bernardo, maria } = await createMatch();
      await safetyService.block(maria.id, bernardo.id);

      await expect(
        datesService.invite(bernardo.id, {
          inviteeId: maria.id,
          place: PLACE,
          scheduledAt: inDays(1).toISOString(),
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should reject a date in the past", async () => {
      const { bernardo, maria } = await createMatch();

      await expect(
        datesService.invite(bernardo.id, {
          inviteeId: maria.id,
          place: PLACE,
          scheduledAt: inDays(-1).toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should reject inviting yourself", async () => {
      const bernardo = await userService.create(mockUser);

      await expect(
        datesService.invite(bernardo.id, {
          inviteeId: bernardo.id,
          place: PLACE,
          scheduledAt: inDays(1).toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should allow only one pending invite per couple, in either direction", async () => {
      const { bernardo, maria } = await createInvite();

      await expect(
        datesService.invite(maria.id, {
          inviteeId: bernardo.id,
          place: PLACE,
          scheduledAt: inDays(2).toISOString(),
        }),
      ).rejects.toThrow(ConflictException);
    });

    it("should allow a new invite once the previous one was answered", async () => {
      const { bernardo, maria, date } = await createInvite();
      await datesService.decline(maria.id, date.id);

      const again = await datesService.invite(bernardo.id, {
        inviteeId: maria.id,
        place: PLACE,
        scheduledAt: inDays(3).toISOString(),
      });
      expect(again!.status).toBe("pending");
    });
  });

  describe("✅ accept / decline", () => {
    it("should let the invitee accept", async () => {
      const { maria, date } = await createInvite();

      const accepted = await datesService.accept(maria.id, date.id);

      expect(accepted.status).toBe("accepted");
      expect(accepted.respondedAt).toBeInstanceOf(Date);
    });

    it("should let the invitee decline", async () => {
      const { maria, date } = await createInvite();

      const declined = await datesService.decline(maria.id, date.id);
      expect(declined.status).toBe("declined");
    });

    it("should not let the inviter answer their own invite", async () => {
      const { bernardo, date } = await createInvite();

      await expect(datesService.accept(bernardo.id, date.id)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(datesService.decline(bernardo.id, date.id)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should not answer an invite twice", async () => {
      const { maria, date } = await createInvite();
      await datesService.accept(maria.id, date.id);

      await expect(datesService.decline(maria.id, date.id)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should not accept a date that already passed", async () => {
      const { maria, date } = await createInvite();
      await dateModel.updateOne({ _id: date._id }, { scheduledAt: inDays(-1) });

      await expect(datesService.accept(maria.id, date.id)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should hide the date from anyone outside the couple", async () => {
      const { date } = await createInvite();
      const stranger = await userService.create({
        ...mockUserMaria,
        email: "ana@example.com",
        username: "ana",
      });

      await expect(datesService.accept(stranger.id, date.id)).rejects.toThrow(
        NotFoundException,
      );
      await expect(datesService.findOne(stranger.id, date.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("❌ cancel", () => {
    it("should let either participant cancel an accepted date", async () => {
      const { bernardo, maria, date } = await createInvite();
      await datesService.accept(maria.id, date.id);

      const canceled = await datesService.cancel(bernardo.id, date.id);
      expect(canceled.status).toBe("canceled");
    });

    it("should let the inviter cancel a pending invite", async () => {
      const { bernardo, date } = await createInvite();

      const canceled = await datesService.cancel(bernardo.id, date.id);
      expect(canceled.status).toBe("canceled");
    });

    it("should not cancel a declined invite", async () => {
      const { bernardo, maria, date } = await createInvite();
      await datesService.decline(maria.id, date.id);

      await expect(datesService.cancel(bernardo.id, date.id)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("🗓️ list and invites", () => {
    it("should list upcoming pending and accepted dates for both participants, soonest first", async () => {
      const { bernardo, maria, date: later } = await createInvite(inDays(10));
      await datesService.accept(maria.id, later.id);
      const sooner = await datesService.invite(maria.id, {
        inviteeId: bernardo.id,
        place: { name: "Parque Lage" },
        scheduledAt: inDays(2).toISOString(),
      });

      const forBernardo = await datesService.list(bernardo.id);
      const forMaria = await datesService.list(maria.id);

      expect(forBernardo.map((d) => d.id)).toEqual([sooner!.id, later.id]);
      expect(forMaria.map((d) => d.id)).toEqual([sooner!.id, later.id]);
    });

    it("should leave out declined, canceled and past dates by default", async () => {
      const { bernardo, maria, date } = await createInvite();
      await datesService.decline(maria.id, date.id);
      await dateModel.create({
        inviter: bernardo._id,
        invitee: maria._id,
        place: PLACE,
        scheduledAt: inDays(-2),
      });

      expect(await datesService.list(bernardo.id)).toHaveLength(0);
    });

    it("should filter by a calendar range", async () => {
      const { bernardo, maria, date } = await createInvite(inDays(3));
      await datesService.accept(maria.id, date.id);
      await dateModel.create({
        inviter: maria._id,
        invitee: bernardo._id,
        place: PLACE,
        scheduledAt: inDays(40),
      });

      const range = await datesService.list(bernardo.id, {
        from: inDays(0).toISOString(),
        to: inDays(30).toISOString(),
      });

      expect(range.map((d) => d.id)).toEqual([date.id]);
    });

    it("should list only the pending invites I received", async () => {
      const { bernardo, maria, date } = await createInvite();

      expect(
        (await datesService.receivedInvites(maria.id)).map((d) => d.id),
      ).toEqual([date.id]);
      expect(await datesService.receivedInvites(bernardo.id)).toHaveLength(0);

      await datesService.accept(maria.id, date.id);
      expect(await datesService.receivedInvites(maria.id)).toHaveLength(0);
    });
  });
});
