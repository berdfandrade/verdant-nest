import { Body, Controller, Get, Param, Post, Patch, Delete, Query, BadRequestException, ParseIntPipe, DefaultValuePipe, ParseBoolPipe } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '@/auth/decorators/admin-only-decorator';
import MongoDbUtils from '@/utils/MongoDB.utils';

@ApiTags('👑 Admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {

    constructor(private readonly adminService : AdminService) {}

    @Post()
    async create(@Body() createAdminDto : CreateAdminDto ) {
        const adminSecretKey = process.env.ADMIN_SECRET_KEY

        if(!adminSecretKey) throw new BadRequestException('Must provide the secretKey as enviroment variable')
        if(createAdminDto.adminSecret !== adminSecretKey) throw new BadRequestException('Must have the correct admin key')

        return this.adminService.create(createAdminDto)
    }

    @AdminOnly()
    @Get()
    getAdminData() {
        return { message: 'You are an admin!' };
    }

    @AdminOnly()
    @Get('stats')
    async stats() {
        return this.adminService.stats();
    }

    @AdminOnly()
    @ApiQuery({ name: 'active', required: false, type: Boolean })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'skip', required: false, type: Number })
    @Get('users')
    async listUsers(
        @Query('active', new ParseBoolPipe({ optional: true })) active?: boolean,
        @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
        @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip = 0,
    ) {
        return this.adminService.listUsers({ active }, Math.min(limit, 100), skip);
    }

    @AdminOnly()
    @Patch('users/:id/ban')
    async ban(@Param('id') id: string) {
        return this.adminService.banUser(MongoDbUtils.toObjectId(id));
    }

    @AdminOnly()
    @Patch('users/:id/unban')
    async unban(@Param('id') id: string) {
        return this.adminService.unbanUser(MongoDbUtils.toObjectId(id));
    }

    @AdminOnly()
    @Patch('users/:id/verify')
    async verify(@Param('id') id: string) {
        return this.adminService.verifyUser(MongoDbUtils.toObjectId(id));
    }

    @AdminOnly()
    @Delete('users/:id')
    async deleteUser(@Param('id') id: string) {
        return this.adminService.deleteUser(MongoDbUtils.toObjectId(id));
    }
}
