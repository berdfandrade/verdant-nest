import mongoose, { ObjectId } from 'mongoose';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { CryptService } from '../security/crypt.service';

@Injectable()
export class UserService {
    constructor(
        @InjectModel(User.name) private userModel: Model<User>,
        private readonly cryptService: CryptService,
    ) {}

    async create(createUserDto: CreateUserDto): Promise<User> {
        const existingUser = await this.userModel.findOne({
            email : createUserDto.email
        });

        if(existingUser) {
            throw new ConflictException('Email already registered');
        }

        const hashedPassword = await this.cryptService.hashPassword(
            createUserDto.password
        )
        
        createUserDto.password = hashedPassword

        const user = new this.userModel(createUserDto)
        return user.save()
    }

    async getUserById(id : string) : Promise<User | null> {
        const userId = new mongoose.Types.ObjectId(id)
        const user = this.userModel.findById(userId)
        if(!user) throw new NotFoundException("User not exists")
        return user
    }
}
