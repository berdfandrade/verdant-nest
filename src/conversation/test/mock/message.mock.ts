import { Message } from '../../../messages/message.schema';
import { Types } from 'mongoose';

export const mockMessage = {
	sender: new Types.ObjectId(),
	content: 'Olá! Tudo bem?',
	convesationId: '',
	sentAt: new Date('2025-05-01T10:00:00Z'),
};

export const mockMessage2 = {
	sender: new Types.ObjectId(),
	content: 'Vou bem e você?',
	convesationId: '',
	sentAt: new Date('2025-05-01T10:00:30Z'),
};

export const mockMessages = [mockMessage, mockMessage2];
