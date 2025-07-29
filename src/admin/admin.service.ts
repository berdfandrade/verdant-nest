import { ConflictException, Injectable, NotFoundException, } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Admin } from "./admin.schema";
import { CreateAdminDto } from "./dto/create-admin.dto";
import { CryptService } from "../security/crypt.service";

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<Admin>,
    private readonly cryptService: CryptService
  ) {}

  async create(createAdminDto: CreateAdminDto) {
    const existingAdmin = await this.adminModel.findOne({
      email: createAdminDto.email,
    });

    if (existingAdmin) {
      throw new ConflictException("Admin email already registered");
    }

    const hashedPassword = await this.cryptService.hashPassword(createAdminDto.password);

    createAdminDto.password = hashedPassword;
    const admin = new this.adminModel(createAdminDto)
    return admin.save()
    
  }

  async findByEmail(email : string) {

    const admin = await this.adminModel.findOne({email : email})
    if(!admin) throw new NotFoundException('Admin Email not registered');
    return admin

  }
}
