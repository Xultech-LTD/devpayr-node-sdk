import { requiredConfig, defaultConfig, resolveDevPayrDomain } from '../config/defaultConfig';
import { ConfigContract } from '../contracts/ConfigContract';
import { DevPayrException } from '../support/Exceptions';

export class Config {
    private config: ConfigContract;

    constructor(userConfig: Partial<ConfigContract>) {
        // Merge default + user config
        this.config = {
            ...defaultConfig,
            ...userConfig,
        } as ConfigContract;

        // Resolve domain BEFORE required validation (user-supplied domain always wins)
        this.config.domain = resolveDevPayrDomain(this.config.domain);

        // Validate required fields
        for (const key in requiredConfig) {
            const value = this.config[key as keyof ConfigContract];
            if (value === null || value === undefined) {
                throw new DevPayrException(`Missing required config field: ${key}`);
            }
        }

        // Ensure at least one of license or api_key is provided
        if (!this.config.license && !this.config.api_key) {
            throw new DevPayrException(
                'Either "license" or "api_key" must be provided in configuration.'
            );
        }

        // Normalize base_url
        this.config.base_url = this.config.base_url.replace(/\/+$/, '') + '/';
    }

    /**
     * Get a config value with optional fallback.
     */
    public get<T = any>(key: keyof ConfigContract, fallback?: T): T {
        const value = this.config[key];
        return value !== undefined && value !== null ? (value as T) : (fallback as T);
    }

    /**
     * Get the full config object.
     */
    public all(): ConfigContract {
        return this.config;
    }

    /**
     * Check if a config key is truthy.
     */
    public isEnabled(key: keyof ConfigContract): boolean {
        return !!this.config[key];
    }

    /**
     * Check if operating in license mode.
     */
    public isLicenseMode(): boolean {
        return !!this.config.license;
    }

    /**
     * Check if operating in API key mode.
     */
    public isApiKeyMode(): boolean {
        return !!this.config.api_key;
    }

    /**
     * Get the active auth credential (license or API key).
     */
    public getAuthCredential(): string {
        return this.config.license || (this.config.api_key as string);
    }
}
