import { CreateAdminDto } from '@/admin/dto/create-admin.dto';

export const mockAdmin: CreateAdminDto = {
	name: 'Admin Verdant',
	email: 'admin@example.com',
	password: 'adminPass123',
	photoUrl: 'https://example.com/admin.jpg',
	adminSecret: 'test-admin-secret',
};
