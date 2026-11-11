import { Types } from 'mongoose';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CryptService } from '@/security/crypt.service';

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

		// Não altera o DTO recebido (evita efeitos colaterais, ex.: mocks compartilhados nos testes)
		const user = new this.userModel({ ...createUserDto, password: hashedPassword });
		return user.save();
	}

	async getUserById(id: Types.ObjectId | string): Promise<User> {
		const user = await this.userModel.findById(id);
		if (!user) throw new NotFoundException('User does not exist');
		return user;
	}

	async findAll(): Promise<User[]> {
		return this.userModel.find();
	}

	async updateRefreshToken(id: Types.ObjectId | string, refreshToken: string | null) {
		const user = await this.userModel.findByIdAndUpdate(id, { refreshToken });
		if (!user) throw new NotFoundException('User does not exists');
	}

	async logout(id: Types.ObjectId | string) {
		const user = await this.userModel.findById(id);
		if (!user) throw new NotFoundException('User does not exist');
		if (!user.refreshToken) return { message: 'Already logged out' };
		user.refreshToken = null;
		await user.save();
		return { message: 'Logout successful' };
	}

	async findByEmail(email: string): Promise<User> {
		const user = await this.userModel.findOne({ email: email });
		if (!user) throw new NotFoundException('Email not registered');
		return user;
	}

	async updateUser(id: Types.ObjectId | string, updateUserDto: UpdateUserDto): Promise<User> {
		const data = { ...updateUserDto };

		if (data.password) {
			data.password = await this.cryptService.hashPassword(data.password);
		}

		const updatedUser = await this.userModel.findByIdAndUpdate(id, data, {
			new: true,
		});

		if (!updatedUser) throw new NotFoundException('User not found');

		return updatedUser;
	}

	async setStatus(
		id: Types.ObjectId | string,
		status: Partial<Pick<User, 'active' | 'verified' | 'premium'>>,
	): Promise<User> {
		const updatedUser = await this.userModel.findByIdAndUpdate(id, status, { new: true });
		if (!updatedUser) throw new NotFoundException('User not found');
		return updatedUser;
	}

	async deleteUser(id: Types.ObjectId | string): Promise<void> {
		const result = await this.userModel.findByIdAndDelete(id);
		if (!result) throw new NotFoundException('User not found');
	}
}
