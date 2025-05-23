import { Controller, Get, Body, Post} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('messages')
export class MessagesController {
    constructor(private readonly messageService : MessagesService) {}

    @Post()
    async send(@Body() data : SendMessageDto) {
        return this.messageService.create(data)
    }
}
