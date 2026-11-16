import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import mongoose, { Model } from "mongoose";
import { getModelToken } from "@nestjs/mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { SetupTestApp } from "@test/test-setup";
import { User } from "@/user/user.schema";
import { UserService } from "@/user/user.service";
import { AuthService } from "@/auth/auth.service";
import { LikesService } from "@/likes/likes.service";
import { AuthDto } from "@/auth/dto/auth.dto";
import { mockUser, mockUserMaria } from "@/user/test/mock/user.mock";
import { DateInvite } from "../date-invite.schema";

let app: INestApplication;
let mongoServer: MongoMemoryServer;
let userService: UserService;
let authService: AuthService;
let likesService: LikesService;
let userModel: Model<User>;
let dateModel: Model<DateInvite>;

const CREDENTIALS: AuthDto = {
  email: "bernardo@example.com",
  password: "securePass123",
};

const MARIA_CREDENTIALS: AuthDto = {
  email: "maria@example.com",
  password: "safePassword456",
};

const INVITE = {
  place: { name: "Brewteco Leblon", address: "R. Dias Ferreira, 420" },
  scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
};

beforeAll(async () => {
  const {
    app: testApp,
    moduleFixture,
    mongoServer: server,
  } = await SetupTestApp();

  app = testApp;
  mongoServer = server;
  userService = moduleFixture.get(UserService);
  authService = moduleFixture.get(AuthService);
  likesService = moduleFixture.get(LikesService);
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

// Bernardo e Maria com match, cada um logado
const setup = async () => {
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

  const { access_token: token } =
    await authService.validateAndLogin(CREDENTIALS);
  const { access_token: mariaToken } =
    await authService.validateAndLogin(MARIA_CREDENTIALS);
  return { bernardo, maria, token, mariaToken };
};

describe("📅 DatesController (e2e)", () => {
  it("should return 401 without token", async () => {
    const response = await request(app.getHttpServer()).get("/dates");
    expect(response.status).toBe(401);
  });

  it("invite → received invites → accept → my dates", async () => {
    const { maria, token, mariaToken } = await setup();
    const server = app.getHttpServer();

    const invite = await request(server)
      .post("/dates")
      .set("Authorization", `Bearer ${token}`)
      .send({ inviteeId: maria.id, ...INVITE });
    expect(invite.status).toBe(201);
    expect(invite.body).toMatchObject({
      status: "pending",
      place: INVITE.place,
    });

    const invites = await request(server)
      .get("/dates/invites")
      .set("Authorization", `Bearer ${mariaToken}`);
    expect(invites.status).toBe(200);
    expect(invites.body.map((d: any) => d._id)).toEqual([invite.body._id]);
    expect(invites.body[0].inviter.fullName).toBe(mockUser.fullName);

    const accept = await request(server)
      .patch(`/dates/${invite.body._id}/accept`)
      .set("Authorization", `Bearer ${mariaToken}`);
    expect(accept.status).toBe(200);
    expect(accept.body.status).toBe("accepted");

    const myDates = await request(server)
      .get("/dates")
      .set("Authorization", `Bearer ${token}`);
    expect(myDates.status).toBe(200);
    expect(myDates.body.map((d: any) => d.status)).toEqual(["accepted"]);

    const detail = await request(server)
      .get(`/dates/${invite.body._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.invitee.fullName).toBe(mockUserMaria.fullName);
  });

  it("PATCH /dates/:id/decline and /cancel should follow the rules", async () => {
    const { maria, token, mariaToken } = await setup();
    const server = app.getHttpServer();

    const { body: date } = await request(server)
      .post("/dates")
      .set("Authorization", `Bearer ${token}`)
      .send({ inviteeId: maria.id, ...INVITE })
      .expect(201);

    // Quem convidou não responde o próprio convite
    await request(server)
      .patch(`/dates/${date._id}/decline`)
      .set("Authorization", `Bearer ${token}`)
      .expect(403);

    await request(server)
      .patch(`/dates/${date._id}/decline`)
      .set("Authorization", `Bearer ${mariaToken}`)
      .expect(200);

    // Já recusado: não dá para cancelar
    await request(server)
      .patch(`/dates/${date._id}/cancel`)
      .set("Authorization", `Bearer ${token}`)
      .expect(409);
  });

  it("POST /dates should validate the body", async () => {
    const { maria, token } = await setup();
    const server = app.getHttpServer();

    const noPlace = await request(server)
      .post("/dates")
      .set("Authorization", `Bearer ${token}`)
      .send({ inviteeId: maria.id, scheduledAt: INVITE.scheduledAt });
    expect(noPlace.status).toBe(400);

    const badDate = await request(server)
      .post("/dates")
      .set("Authorization", `Bearer ${token}`)
      .send({
        inviteeId: maria.id,
        place: INVITE.place,
        scheduledAt: "sábado às 19h",
      });
    expect(badDate.status).toBe(400);

    const emptyPlaceName = await request(server)
      .post("/dates")
      .set("Authorization", `Bearer ${token}`)
      .send({ inviteeId: maria.id, ...INVITE, place: { name: "" } });
    expect(emptyPlaceName.status).toBe(400);
  });

  it("POST /dates should return 409 for a second pending invite", async () => {
    const { maria, token } = await setup();
    const server = app.getHttpServer();

    await request(server)
      .post("/dates")
      .set("Authorization", `Bearer ${token}`)
      .send({ inviteeId: maria.id, ...INVITE })
      .expect(201);
    await request(server)
      .post("/dates")
      .set("Authorization", `Bearer ${token}`)
      .send({ inviteeId: maria.id, ...INVITE })
      .expect(409);
  });

  it("GET /dates/:id should return 404 for an unknown date", async () => {
    const { token } = await setup();

    const response = await request(app.getHttpServer())
      .get(`/dates/${new mongoose.Types.ObjectId()}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
  });

  it("GET /dates should validate the calendar range", async () => {
    const { token } = await setup();

    const response = await request(app.getHttpServer())
      .get("/dates?from=ontem")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
  });
});
