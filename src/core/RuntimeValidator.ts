// src/core/RuntimeValidator.ts

import { Config } from './Config';
import { DevPayrException, LicenseValidationException } from '../support/Exceptions';
import { InjectableHandler } from '../utils/InjectableHandler';
import { PaymentService } from '../services/PaymentService';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';

export class RuntimeValidator {
    private config: Config;
    private license: string;
    private cacheKey: string;

    constructor(config: Config) {
        this.config = config;
        this.license = this.config.get<string>('license');

        if (!this.license) {
            throw new DevPayrException('License key is required for runtime validation.');
        }

        // Domain-aware cache key (domain can be a hostname OR a stable fingerprint)
        const domain = this.config.get<string>('domain');
        this.cacheKey = 'devpayr_' + this.hash(`${this.license}::${domain}`);
    }

    /**
     * Perform license validation and optionally auto-process injectables.
     */
    public async validate(): Promise<any> {
        // If recheck is false, allow cache to skip network call.
        if (!this.config.get('recheck') && this.isCached()) {
            return {
                cached: true,
                message: 'License validated from cache',
            };
        }

        const response = await new PaymentService(this.config).checkWithLicenseKey();

        if (!(response?.data?.has_paid ?? false)) {
            throw new LicenseValidationException('Project is unpaid or unauthorized.');
        }

        this.cacheSuccess();

        // Register custom processor
        const processor = this.config.get('injectablesProcessor');
        if (processor) {
            InjectableHandler.setProcessor(processor);
        }

        // Auto-process injectables if allowed
        if (
            this.config.get('injectables') &&
            this.config.get('handleInjectables', true) &&
            Array.isArray(response?.data?.injectables) &&
            response.data.injectables.length > 0
        ) {
            this.handleInjectables(response.data.injectables);
        }

        return response;
    }

    /**
     * Handle injectable processing via handler utility.
     */
    private handleInjectables(injectables: any[]): void {
        InjectableHandler.process(injectables, {
            secret: this.config.get<string>('secret'),
            path: this.config.get<string>('injectablesPath', os.tmpdir()),
            verify: this.config.get<boolean>('injectablesVerify', true),
        });
    }

    /**
     * Resolve cache directory (project-local by default).
     */
    private resolveCacheDir(): string {
        const configured = this.config.get<string | null>('cachePath', null);

        // If user supplied a cache path, use it.
        if (configured && String(configured).trim()) {
            return path.resolve(String(configured).trim());
        }

        // Default: project-local cache folder
        return path.resolve(process.cwd(), '.devpayr-cache');
    }

    /**
     * Resolve cache file path.
     */
    private resolveCacheFile(): string {
        const dir = this.resolveCacheDir();
        return path.join(dir, `${this.cacheKey}.txt`);
    }

    /**
     * Write cache file with today's date (YYYY-MM-DD).
     * Never throws — caching should not break the app in restricted environments.
     */
    private cacheSuccess(): void {
        try {
            const dir = this.resolveCacheDir();
            fs.mkdirSync(dir, { recursive: true });

            const file = this.resolveCacheFile();
            fs.writeFileSync(file, new Date().toISOString().slice(0, 10), { encoding: 'utf8' });
        } catch {
            // If the environment is read-only or restricted, skip caching silently.
            // (License validation still works; caching is just an optimization.)
        }
    }

    /**
     * Check if cache file exists and is still valid for today.
     * Never throws.
     */
    private isCached(): boolean {
        try {
            const file = this.resolveCacheFile();

            if (!fs.existsSync(file)) return false;

            const content = fs.readFileSync(file, 'utf-8').trim();
            return content === new Date().toISOString().slice(0, 10);
        } catch {
            return false;
        }
    }


    /**
     * Create SHA-256 hash string.
     */
    private hash(input: string): string {
        return crypto.createHash('sha256').update(input).digest('hex');
    }
}
