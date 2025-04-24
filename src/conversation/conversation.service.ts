import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import {Model, Types} from 'mongoose'
import { Conversation, ConversationDocument } from "./schemas/conversation.schema";
import { CreateConversationDto } from "./dto/create-conversation.dto";

@Injectable()
export class ConversationService {
    constructor(
        @InjectModel(Conversation.name)
        private conversationModel : Model<ConversationDocument>
    ) {}

    async create(createDto : CreateConversationDto) : Promise<Conversation> {
        const newConversation = new this.conversationModel(createDto)
        return newConversation.save()
    }
    
}