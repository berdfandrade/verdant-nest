import { Body, Controller, Get, Param, Post, Put, Delete, Query, UseGuards, HttpCode } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './user.schema';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import MongoDbUtils from '../utils/MongoDB.utils';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SelfOnly } from '../auth/decorators/self-only.decorator';
import { AdminOnly } from '../auth/decorators/admin-only-decorator';
import { User as CurrentUser } from '../auth/decorators/user.decorator';

@ApiTags('👤 Users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
	constructor(private readonly userService: UserService) {}

	// Cadastro (público)
	@Post()
	async create(@Body() createUserDto: CreateUserDto): Promise<User> {
		return this.userService.create(createUserDto);
	}

	@AdminOnly()
	@Get()
	async findAll(): Promise<User[]> {
		return this.userService.findAll();
	}

	@AdminOnly()
	@Get('email')
	async findByEmail(@Query('email') email: string): Promise<User> {
		return this.userService.findByEmail(email);
	}

	@UseGuards(JwtAuthGuard)
	@Get('me')
	async me(@CurrentUser() user: User): Promise<User> {
		return user;
	}

	@UseGuards(JwtAuthGuard)
	@Get(':id')
	async getUserById(@Param('id') id: string): Promise<User> {
		const Id = MongoDbUtils.toObjectId(id);
		return this.userService.getUserById(Id);
	}

	@SelfOnly()
	@Put(':id')
	async updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto): Promise<User> {
		const Id = MongoDbUtils.toObjectId(id);
		return this.userService.updateUser(Id, updateUserDto);
	}

	@SelfOnly()
	@Delete(':id')
	@HttpCode(204)
	async deleteUser(@Param('id') id: string): Promise<void> {
		const Id = MongoDbUtils.toObjectId(id);
		return this.userService.deleteUser(Id);
	}
}
