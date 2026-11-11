import { mkdtemp, readFile, rm, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { detectImageType } from '../image-type';
import { LocalStorageService } from '../local-storage.service';
import { S3StorageService } from '../s3-storage.service';
import { JPEG_HEADER, NOT_AN_IMAGE, PNG_1PX, WEBP_HEADER } from '@test/fixtures/images';

describe('🖼️ detectImageType', () => {
	it('should detect JPEG, PNG and WEBP by their magic bytes', () => {
		expect(detectImageType(JPEG_HEADER)?.mime).toBe('image/jpeg');
		expect(detectImageType(PNG_1PX)?.mime).toBe('image/png');
		expect(detectImageType(WEBP_HEADER)?.mime).toBe('image/webp');
	});

	it('should return null for anything else', () => {
		expect(detectImageType(NOT_AN_IMAGE)).toBeNull();
		expect(detectImageType(Buffer.alloc(0))).toBeNull();
	});
});

describe('💾 LocalStorageService', () => {
	let dir: string;
	let storage: LocalStorageService;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), 'verdant-uploads-'));
		storage = new LocalStorageService(dir, '/uploads');
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	it('should save the file and return its public url', async () => {
		const stored = await storage.upload({ key: 'users/abc/photo.png', body: PNG_1PX, contentType: 'image/png' });

		expect(stored.url).toBe('/uploads/users/abc/photo.png');
		expect(await readFile(join(dir, 'users/abc/photo.png'))).toEqual(PNG_1PX);
	});

	it('should delete the file (and ignore files that do not exist)', async () => {
		await storage.upload({ key: 'users/abc/photo.png', body: PNG_1PX, contentType: 'image/png' });

		await storage.delete('users/abc/photo.png');
		await expect(stat(join(dir, 'users/abc/photo.png'))).rejects.toThrow();

		await expect(storage.delete('users/abc/photo.png')).resolves.toBeUndefined();
	});

	it('should refuse keys that try to escape the uploads folder', async () => {
		await expect(
			storage.upload({ key: '../../etc/passwd', body: PNG_1PX, contentType: 'image/png' }),
		).rejects.toThrow('Invalid storage key');
	});
});

describe('☁️ S3StorageService', () => {
	const ENV = { ...process.env };

	afterEach(() => {
		process.env = { ...ENV };
	});

	const fakeClient = () => ({ send: jest.fn().mockResolvedValue({}) }) as unknown as S3Client & { send: jest.Mock };

	it('should require a bucket', () => {
		delete process.env.S3_BUCKET;
		expect(() => new S3StorageService(fakeClient())).toThrow('S3_BUCKET');
	});

	it('should upload with the right bucket, key and content type', async () => {
		process.env.S3_BUCKET = 'verdant-photos';
		process.env.S3_PUBLIC_URL = 'https://cdn.verdant.app/';
		const client = fakeClient();
		const storage = new S3StorageService(client);

		const stored = await storage.upload({ key: 'users/abc/photo.jpg', body: JPEG_HEADER, contentType: 'image/jpeg' });

		const command = client.send.mock.calls[0][0];
		expect(command).toBeInstanceOf(PutObjectCommand);
		expect(command.input).toMatchObject({
			Bucket: 'verdant-photos',
			Key: 'users/abc/photo.jpg',
			ContentType: 'image/jpeg',
		});
		expect(stored.url).toBe('https://cdn.verdant.app/users/abc/photo.jpg');
	});

	it('should build the public url from the endpoint for S3-compatible providers', async () => {
		process.env.S3_BUCKET = 'photos';
		process.env.S3_ENDPOINT = 'http://localhost:9000';
		delete process.env.S3_PUBLIC_URL;
		const storage = new S3StorageService(fakeClient());

		const stored = await storage.upload({ key: 'users/abc/p.png', body: PNG_1PX, contentType: 'image/png' });
		expect(stored.url).toBe('http://localhost:9000/photos/users/abc/p.png');
	});

	it('should delete the object', async () => {
		process.env.S3_BUCKET = 'verdant-photos';
		const client = fakeClient();
		const storage = new S3StorageService(client);

		await storage.delete('users/abc/photo.jpg');

		const command = client.send.mock.calls[0][0];
		expect(command).toBeInstanceOf(DeleteObjectCommand);
		expect(command.input).toEqual({ Bucket: 'verdant-photos', Key: 'users/abc/photo.jpg' });
	});
});
