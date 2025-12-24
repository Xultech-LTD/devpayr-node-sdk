// src/core/DevPayr.ts

import { Config } from './Config';
import { RuntimeValidator } from './RuntimeValidator';
import { ProjectService } from '../services/ProjectService';
import { LicenseService } from '../services/LicenseService';
import { DomainService } from '../services/DomainService';
import { InjectableService } from '../services/InjectableService';
import { PaymentService } from '../services/PaymentService';
import * as fs from 'node:fs';
import * as path from 'node:path';

export class DevPayr {
    private static configInstance: Config;

    /**
     * Bootstraps the SDK (validates license, loads injectables if applicable).
     */
    public static async bootstrap(userConfig: Record<string, any>): Promise<void> {
        this.configInstance = new Config(userConfig);

        try {
            let data: any = null;

            if (this.configInstance.isLicenseMode()) {
                const validator = new RuntimeValidator(this.configInstance);
                data = await validator.validate();
            }

            const onReady = this.configInstance.get('onReady');
            if (typeof onReady === 'function') {
                onReady(data);
            }
        } catch (e: any) {
            const message = e?.message ?? 'License validation failed';
            this.handleFailure(message);
        }
    }

    /**
     * Handle invalid license failure depending on mode.
     * Uses the merged/normalized config from Config (not raw userConfig).
     */
    private static handleFailure(message: string): void {
        type InvalidBehavior = 'log' | 'modal' | 'redirect' | 'silent';

        const mode = this.configInstance.get<InvalidBehavior>('invalidBehavior', 'modal');
        const finalMessage = this.configInstance.get<string>('customInvalidMessage', message);

        switch (mode) {
            case 'redirect': {
                const target =
                    this.configInstance?.get('redirectUrl', 'https://devpayr.com/upgrade') ??
                    'https://devpayr.com/upgrade';

                if (typeof window !== 'undefined' && window?.location) {
                    window.location.href = target;
                } else {
                    console.error(`[DevPayr] Redirect failed. Not running in a browser context.`);
                    console.error(`[DevPayr] Redirect target: ${target}`);
                    console.error(`[DevPayr] Message: ${finalMessage}`);
                }
                break;
            }

            case 'log':
                console.error(`[DevPayr] License validation failed: ${finalMessage}`);
                break;

            case 'silent':
                break;

            case 'modal':
            default: {
                const customPath = this.configInstance?.get('customInvalidView', null);
                const defaultPath = path.resolve(__dirname, '../resources/views/unlicensed.html');
                const htmlPath = (customPath as string | null) ?? defaultPath;

                try {
                    let html = fs.readFileSync(htmlPath, 'utf-8');
                    html = html.replace('{{message}}', finalMessage);

                    if (typeof document !== 'undefined' && document?.body) {
                        const container = document.createElement('div');
                        container.innerHTML = html;
                        document.body.appendChild(container);
                    } else {
                        // Node context fallback
                        console.log(html);
                    }
                } catch {
                    // last-resort fallback (works everywhere)
                    console.log(`⚠️ Unlicensed Software\n\n${finalMessage}`);
                }

                break;
            }
        }
    }

    /**
     * Access raw config (advanced use).
     */
    public static config(): Config {
        return this.configInstance;
    }

    // ---------------------------------------------------------------
    // 🔹 Service Accessors
    // ---------------------------------------------------------------

    public static projects(): ProjectService {
        return new ProjectService(this.configInstance);
    }

    public static licenses(): LicenseService {
        return new LicenseService(this.configInstance);
    }

    public static domains(): DomainService {
        return new DomainService(this.configInstance);
    }

    public static injectables(): InjectableService {
        return new InjectableService(this.configInstance);
    }

    public static payments(): PaymentService {
        return new PaymentService(this.configInstance);
    }
}
