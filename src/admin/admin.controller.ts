
import { Body, Controller, Get, Param, Post, Put, Delete, Query, BadRequestException, UseGuards}from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { Admin } from './admin.schema';
import { ApiTags } from '@nestjs/swagger';


@ApiTags('👑 Admin')
@Controller('admin')
export class AdminController {
    
    constructor(private readonly adminService : AdminService) {}

    private adminSecretKey = process.env.ADMIN_SECRET_KEY

    @Post()
    async create(@Body() createAdminDto : CreateAdminDto ) : Promise<Admin | string >{
        
        if(!this.adminSecretKey) throw new BadRequestException('Must provide the secretKey as enviroment variable')
        if(createAdminDto.adminSecret !== this.adminSecretKey) throw new BadRequestException('Must have the correct admin key')
        
        return this.adminService.create(createAdminDto)
    }

    @Get()
    getAdminData() {
        return { message: 'You are an admin!' };
  }

}