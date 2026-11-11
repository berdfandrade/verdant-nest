import { ConflictException, Injectable, NotFoundException, } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Admin } from "./admin.schema";
import { CreateAdminDto } from "./dto/create-admin.dto";
import { CryptService } from "@/security/crypt.service";
import { UserService } from "@/user/user.service";
import { User } from "@/user/user.schema";

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<Admin>,
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly cryptService: CryptService,
    private readonly userService: UserService,
  ) {}

  async create(createAdminDto: CreateAdminDto) {
    const existingAdmin = await this.adminModel.findOne({
      email: createAdminDto.email,
    });

    if (existingAdmin) {
      throw new ConflictException("Admin email already registered");
    }

    const { adminSecret, ...data } = createAdminDto;
    const hashedPassword = await this.cryptService.hashPassword(data.password);

    const admin = new this.adminModel({ ...data, password: hashedPassword });
    return admin.save();
  }

  async findByEmail(email : string) {
    const admin = await this.adminModel.findOne({email : email})
    if(!admin) throw new NotFoundException('Admin Email not registered');
    return admin
  }

  // ---- Gestão de usuários ----

  async listUsers(filter: { active?: boolean } = {}, limit = 50, skip = 0) {
    const query: Record<string, any> = {};
    if (filter.active !== undefined) query.active = filter.active;

    const [users, total] = await Promise.all([
      this.userModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.userModel.countDocuments(query),
    ]);

    return { total, limit, skip, users };
  }

  async banUser(id: Types.ObjectId) {
    const user = await this.userService.setStatus(id, { active: false });
    // Invalida o refresh token para forçar logout
    await this.userService.updateRefreshToken(id, null);
    return user;
  }

  async unbanUser(id: Types.ObjectId) {
    return this.userService.setStatus(id, { active: true });
  }

  async verifyUser(id: Types.ObjectId) {
    return this.userService.setStatus(id, { verified: true });
  }

  async deleteUser(id: Types.ObjectId) {
    await this.userService.deleteUser(id);
    return { message: 'User deleted' };
  }

  async stats() {
    const [users, activeUsers, premiumUsers, verifiedUsers] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ active: true }),
      this.userModel.countDocuments({ premium: true }),
      this.userModel.countDocuments({ verified: true }),
    ]);
    return { users, activeUsers, premiumUsers, verifiedUsers };
  }
}
