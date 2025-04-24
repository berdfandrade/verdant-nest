import { Test, TestingModule } from '@nestjs/testing';
import { CryptService } from '../crypt.service';
import * as bcrypt from 'bcrypt';

let cryptService: CryptService;

beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
        providers: [CryptService],
    }).compile();

    cryptService = module.get<CryptService>(CryptService);
});

describe('🔒 CryptService', () => {
    it('❗ should be defined', () => {
        expect(cryptService).toBeDefined();
    });

    describe('✅ Hash Password', () => {
        it('should generate a hash for the password', async () => {
            const password = 'securePassword123';
            const hash = await cryptService.hashPassword(password);

            expect(hash).toBeDefined();
            expect(hash).not.toBe(password);
        });

        it('shold correctly compare a valid password', async () => {
            const password = 'securePassword123';
            const hash = await cryptService.hashPassword(password);
            const isMatch = await cryptService.comparePasswords(password, hash);

            expect(isMatch).toBe(true);
        });

        it('should return false for an incorrect password', async () => {
            const password = 'correctPassword';
            const wrongPassword = 'wrongPassword';
            const hash = await cryptService.hashPassword(password);
            const isMatch = await cryptService.comparePasswords(
                wrongPassword,
                hash,
            );

            expect(isMatch).toBe(false);
        });

        it('should call bcrypt.hash with the correct arguments', async () => {
            const password = 'testPassword';
            const hashSpy = jest.spyOn(bcrypt, 'hash');

            await cryptService.hashPassword(password);

            expect(hashSpy).toHaveBeenCalledWith(password, 10);
        });

        it('should call bcrypt.compare with the correct arguments', async () => {
            const password = 'testPassword';
            const hash = await cryptService.hashPassword(password);
            const compareSpy = jest.spyOn(bcrypt, 'compare');

            await cryptService.comparePasswords(password, hash);

            expect(compareSpy).toHaveBeenCalledWith(password, hash);
        });
    });
});
