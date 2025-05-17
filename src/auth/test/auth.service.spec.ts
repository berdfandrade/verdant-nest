import { UnauthorizedException, NotFoundException } from "@nestjs/common";
import mongoose, { Model } from "mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { UserService } from "../../user/user.service";
import { AuthService } from "../auth.service";
import { JwtService } from "@nestjs/jwt";
import { CryptService } from "../../security/crypt.service";
import { User, UserSchema } from "../../user/user.schema";
import { getModelToken, MongooseModule } from "@nestjs/mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { mockUser } from "../../user/test/mock/user.mock";

let mongoServer: MongoMemoryServer;
let authService: AuthService;
let userService: UserService;
let cryptService: CryptService;
let jwtService: JwtService;
let userModel: Model<User>;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      MongooseModule.forRoot(mongoUri),
      MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    ],
    providers: [
      AuthService,
      UserService,
      CryptService,
      {
        provide: JwtService,
        useValue: {
          sign: jest.fn().mockReturnValue("mockAccessToken"),
        },
      },
    ],
  }).compile();
  
  authService = moduleFixture.get<AuthService>(AuthService);
  userService = moduleFixture.get<UserService>(UserService);
  cryptService = moduleFixture.get<CryptService>(CryptService);
  jwtService = moduleFixture.get<JwtService>(JwtService);
  userModel = moduleFixture.get<Model<User>>(getModelToken(User.name));
});

beforeEach(async () => {
  await userModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("🔐 AuthService", () => {
  it("❗ should be defined", () => {
    expect(authService).toBeDefined();
  });

  describe("✅ validateUser", () => {
    it("should return user if credentials are valid", async () => {
      const hashedPassword = await cryptService.hashPassword(mockUser.password);
      await userModel.create({ ...mockUser, password: hashedPassword });

      const user = await authService.validateUser(
        mockUser.email,
        mockUser.password
      );
      expect(user).toBeDefined();
      expect(user?.email).toBe(mockUser.email);
    });

    it("should throw NotFoundException if user is not found", async () => {
      await expect(
        authService.validateUser("nonexistent@example.com", "password")
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw UnauthorizedException if password is invalid", async () => {
      const hashedPassword = await cryptService.hashPassword(mockUser.password);
      await userModel.create({ ...mockUser, password: hashedPassword });

      await expect(
        authService.validateUser(mockUser.email, "wrongPassword")
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("✅ login", () => {
    it("should return access token and user info", async () => {
      // Cria um usuário mockado no banco de dados
      const hashedPassword = await cryptService.hashPassword(mockUser.password);
      const createdUser = await userModel.create({
        ...mockUser,
        password: hashedPassword,
      });

      // Testa o login
      const result = await authService.login(createdUser);

      expect(result).toBeDefined();
      expect(result.access_token).toBe("mockAccessToken");
      expect(result.user).toEqual({
        id: createdUser.id.toString(),
        email: createdUser.email,
      });
    });
  });
});
