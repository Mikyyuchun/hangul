import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
    private readonly algorithm = 'aes-256-cbc';
    private readonly key: Buffer;
    private readonly iv: Buffer;

    constructor(private configService: ConfigService) {
        const keyString = this.configService.get<string>('ENCRYPTION_KEY');
        const ivString = this.configService.get<string>('ENCRYPTION_IV');

        if (!keyString || !ivString) {
            throw new Error('Encryption key or IV not configured');
        }

        this.key = Buffer.from(keyString, 'hex');
        this.iv = Buffer.from(ivString, 'hex');
    }

    encrypt(text: string): string {
        const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }

    decrypt(text: string): string {
        const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.iv);
        let decrypted = decipher.update(text, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
