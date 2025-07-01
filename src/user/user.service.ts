import { Types } from 'mongoose';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CryptService } from '../security/crypt.service';

@Injectable()
export class UserService {
	constructor(
		@InjectModel(User.name) private userModel: Model<User>,
		private readonly cryptService: CryptService,
	) {}

	async create(createUserDto: CreateUserDto): Promise<User> {
		const existingUser = await this.userModel.findOne({
			email: createUserDto.email,
		});

		if (existingUser) {
			throw new ConflictException('Email already registered');
		}

		const hashedPassword = await this.cryptService.hashPassword(createUserDto.password);

		createUserDto.password = hashedPassword;

		const user = new this.userModel(createUserDto);
		return user.save();
	}

	async getUserById(id: Types.ObjectId): Promise<User> {
		const user = await this.userModel.findById(id);
		if (!user) throw new NotFoundException('User does not exist');
		return user;
	}

	async findAll(): Promise<User[]> {
		return this.userModel.find();
	}

	async updateRefreshToken(id: Types.ObjectId, refreshToken: string) {
		const user = await this.userModel.findById(id);
		if (!user) throw new NotFoundException('User does not exists');
		await this.userModel.findByIdAndUpdate(id, { refreshToken });
	}

	async logout(id: Types.ObjectId) {
		const user = await this.userModel.findById(id);
		if (!user) throw new NotFoundException('User does not exist');
		if (user.refreshToken === null) return { message: 'Already logged out' };
		user.refreshToken = null;
		await user.save();
		return { message: 'Logout successful' };
	}

	async findByEmail(email: string): Promise<User> {
		const user = await this.userModel.findOne({ email: email });
		if (!user) throw new NotFoundException('Email not registered');
		return user;
	}

	async updateUser(id: Types.ObjectId, updateUserDto: UpdateUserDto): Promise<User> {
		if (updateUserDto.password) {
			updateUserDto.password = await this.cryptService.hashPassword(
				updateUserDto.password,
			);
		}

		const updatedUser = await this.userModel.findByIdAndUpdate(id, updateUserDto, {
			new: true,
		});

		if (!updatedUser) throw new NotFoundException('User not found');

		return updatedUser;
	}

	async deleteUser(id: Types.ObjectId): Promise<void> {
		const result = await this.userModel.findByIdAndDelete(id);
		if (!result) throw new NotFoundException('User not found');
	}
}
