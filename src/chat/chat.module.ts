import { Module } from "@nestjs/common";
import { ChatGateway} from "./chat.gateway";
import {ChatService} from './chat.service'
import { ConversationModule } from '../conversation/conversation.module';

@Module({
    imports : [ConversationModule],
    providers : [ChatGateway, ChatService]
})
export class ChatModule{}