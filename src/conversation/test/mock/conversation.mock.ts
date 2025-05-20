import { Types } from 'mongoose';

export const conversationMock = {
	_id: new Types.ObjectId(),
	participants: [new Types.ObjectId(), new Types.ObjectId()],
	messages: [
		{
			sender: new Types.ObjectId(),
			content: 'Olá! Tudo bem?',
			sentAt: new Date('2025-05-01T10:00:00Z'),
		},
		{
			sender: new Types.ObjectId(),
			content: 'Tudo ótimo, e você?',
			sentAt: new Date('2025-05-01T10:05:00Z'),
		},
	],
	startedAt: new Date('2025-05-01T09:58:00Z'),
	isActive: true,
	archivedAt: undefined, // ✅ Corrigido aqui
};
