import { Types } from 'mongoose';

export const conversationMock = {
	participants: [new Types.ObjectId(), new Types.ObjectId()],
	messages: [],
	startedAt: new Date('2025-05-01T09:58:00Z'),
	isActive: true,
	archivedAt: undefined, 
};

export const emptyConvesationMock = {
	participants: [new Types.ObjectId(), new Types.ObjectId()],
		messages: [],
		statedAt : new Date(),
		isActive : true,
		archivedAt : undefined

}

export const mockerConversation = (participant1Id?, participant2Id?) => {

	return {
		participants: [
			participant1Id ? participant1Id : new Types.ObjectId(), 
			participant2Id ? participant2Id : new Types.ObjectId()],
		messages: [
			{
				sender: participant1Id ? participant1Id : new Types.ObjectId(),
				content: 'Olá! Tudo bem?',
				sentAt: new Date('2025-05-01T10:00:00Z'),
			},
			{
				sender: participant2Id ? participant2Id : new Types.ObjectId(),
				content: 'Tudo ótimo, e você?',
				sentAt: new Date('2025-05-01T10:05:00Z'),
			},
		],
		startedAt: new Date('2025-05-01T09:58:00Z'),
		isActive: true,
		archivedAt: undefined, // ✅ Corrigido aqui
	};
};
