import { Body, Controller, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './user.schema'

@Controller()
export class UserController {
    constructor(private readonly userService : UserService){}

    @Post()
    async create(@Body() createUserDto : CreateUserDto) : Promise<User>{
        return this.userService.create(createUserDto)
    }
}