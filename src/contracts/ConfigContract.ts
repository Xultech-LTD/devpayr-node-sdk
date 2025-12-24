export interface ConfigContract {
    // Required
    base_url: string;
    secret: string;

    /**
     * Domain (or stable fingerprint fallback) used for domain-aware checks.
     * - If not provided by user, SDK auto-resolves from environment variables.
     * - If still not available, SDK generates & persists a fingerprint.
     */
    domain: string;

    // Optional but critical
    license?: string | null;
    api_key?: string | null;

    // Runtime options
    recheck: boolean;
    action: string;
    timeout: number;
    per_page?: number | null;

    // Injectable options
    injectables: boolean;
    injectablesVerify: boolean;
    injectablesPath?: string | null;
    handleInjectables: boolean;
    injectablesProcessor?: InjectableProcessor | null;

    // Invalid license behavior
    invalidBehavior: 'log' | 'modal' | 'redirect' | 'silent';
    redirectUrl?: string | null;
    customInvalidView?: any; // can be HTML string, component, or custom handler
    customInvalidMessage?: string;
    cachePath?: string | null;

    // Hooks
    onReady?: ((response: any) => void) | null;
}

// Define injectable processor interface separately
export interface InjectableProcessor {
    /**
     * Process the decrypted injectable string and return processed output.
     * This could mutate or save the file depending on context.
     */
    process(content: string, metadata?: Record<string, any>): Promise<void> | void;
}
