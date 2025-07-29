import { Body, Controller, Get, Param, Post, Put, Delete, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './user.schema';
import { ApiTags } from '@nestjs/swagger';
import MongoDbUtils from '../utils/MongoDB.utils';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@ApiTags('👤 Users')

@Controller('users')
export class UserController {
	constructor(private readonly userService: UserService) {}

	@Post()
	async create(@Body() createUserDto: CreateUserDto): Promise<User> {
		return this.userService.create(createUserDto);
	}

	@Get()
	async findAll(): Promise<User[]> {
		return this.userService.findAll();
	}

	@Get('email')
	async findByEmail(@Query('email') email: string): Promise<User> {
		return this.userService.findByEmail(email);
	}

	@Get(':id')
	async getUserById(@Param('id') id: string): Promise<User> {
		const Id = MongoDbUtils.toObjectId(id);
		return this.userService.getUserById(Id);
	}

	@Put(':id')
	async updateUser(
		@Param('id') id: string,
		@Body() updateUserDto: UpdateUserDto,
	): Promise<User> {
		const Id = MongoDbUtils.toObjectId(id);
		return this.userService.updateUser(Id, updateUserDto);
	}

	@Delete(':id')
	async deleteUser(@Param('id') id: string): Promise<void> {
		const Id = MongoDbUtils.toObjectId(id);
		return this.userService.deleteUser(Id);
	}
}
