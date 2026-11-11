import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash, timingSafeEqual } from 'crypto';

@Injectable()
export class CryptService {
    private readonly saltRounds = 10;

    async hash(str : string ) : Promise<string> {
        return await bcrypt.hash(str, this.saltRounds)
    }

    async hashPassword(password: string): Promise<string> {
        return await bcrypt.hash(password, this.saltRounds);
    }

    async comparePasswords(password: string, hash: string): Promise<boolean> {
        return await bcrypt.compare(password, hash);
    }

    /*
        Hash para tokens longos (ex.: refresh token JWT).
        O bcrypt só considera os primeiros 72 bytes da string, e dois JWTs do mesmo
        usuário são iguais nesse trecho — por isso usamos SHA-256 aqui.
    */
    hashToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    compareToken(token: string, hashedToken: string): boolean {
        const a = Buffer.from(this.hashToken(token), 'hex');
        const b = Buffer.from(hashedToken, 'hex');
        return a.length === b.length && timingSafeEqual(a, b);
    }
}
