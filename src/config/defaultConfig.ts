/**
 * Default and required configuration values for the DevPayr Node SDK.
 * These are merged with user-supplied values by the Config.ts class.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

type Nullable<T> = T | null;

const FINGERPRINT_DIR = path.join(os.homedir(), '.devpayr');
const FINGERPRINT_FILE = path.join(FINGERPRINT_DIR, 'node-sdk-fingerprint');

/**
 * Strips protocols and any path/query/hash/credentials and returns only hostname (lowercased).
 * - "https://sub.example.com:3000/path" => "sub.example.com"
 * - "sub.example.com" => "sub.example.com"
 * Returns null if it cannot produce a valid hostname.
 */
function normalizeHostname(input: unknown): Nullable<string> {
    if (typeof input !== 'string') return null;

    const raw = input.trim();
    if (!raw) return null;

    // If it's a plain hostname without scheme, prepend scheme to use URL parsing safely.
    // But avoid cases like "localhost" still parseable; we will validate later.
    let candidate = raw;

    // Remove surrounding whitespace + common accidental quotes
    candidate = candidate.replace(/^['"]|['"]$/g, '');

    try {
        const url = candidate.includes('://')
            ? new URL(candidate)
            : new URL(`https://${candidate}`);

        const host = (url.hostname || '').trim().toLowerCase();
        if (!host) return null;

        // If someone passed an IP, you might still want it — but your server expects a "domain".
        // We'll treat IPs as invalid and fall back to fingerprint.
        if (isIpAddress(host)) return null;

        // Basic hostname validation:
        // - contains dots (sub.domain.tld) OR is localhost-like (optional decision)
        // For DevPayr domain checks, you likely want real domains; treat localhost as invalid here.
        if (!isValidHostname(host)) return null;

        return host;
    } catch {
        // If URL parsing fails, attempt a manual strip of protocol then validate.
        const stripped = candidate
            .replace(/^https?:\/\//i, '')
            .replace(/\/.*$/, '')     // drop path
            .replace(/\?.*$/, '')     // drop query
            .replace(/#.*$/, '')      // drop hash
            .replace(/:.*$/, '')      // drop port
            .trim()
            .toLowerCase();

        if (!stripped) return null;
        if (isIpAddress(stripped)) return null;
        if (!isValidHostname(stripped)) return null;

        return stripped;
    }
}

/**
 * Very small hostname validator.
 * - Requires at least one dot (e.g. example.com) OR a subdomain (a.b.com)
 * - Disallows invalid label patterns.
 */
function isValidHostname(hostname: string): boolean {
    // Must contain at least one dot to be treated as a domain.
    if (!hostname.includes('.')) return false;

    // Total length limit
    if (hostname.length > 253) return false;

    // Validate each label
    const labels = hostname.split('.');
    for (const label of labels) {
        if (!label) return false;
        if (label.length > 63) return false;

        // Labels: a-z 0-9 hyphen; cannot start/end with hyphen
        if (!/^[a-z0-9-]+$/.test(label)) return false;
        if (label.startsWith('-') || label.endsWith('-')) return false;
    }

    return true;
}

function isIpAddress(host: string): boolean {
    // IPv4
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
    // IPv6 (very relaxed)
    if (/^[0-9a-f:]+$/i.test(host) && host.includes(':')) return true;
    return false;
}

/**
 * Attempt to infer the runtime domain/subdomain from common environment variables.
 * Order matters: most explicit → most generic.
 */
function inferDomainFromEnvironment(): Nullable<string> {
    const env = process.env;

    const candidates: Array<unknown> = [
        env.DEVPAYR_DOMAIN,
        env.APP_DOMAIN,

        // Common “app url” patterns
        env.APP_URL,
        env.SITE_URL,
        env.PUBLIC_URL,

        // Hosting providers
        env.VERCEL_URL,             // often "myapp.vercel.app" (no scheme)
        env.VERCEL_PROJECT_PRODUCTION_URL,
        env.RENDER_EXTERNAL_URL,    // usually full https://...
        env.RAILWAY_STATIC_URL,
        env.FLY_APP_NAME ? `${env.FLY_APP_NAME}.fly.dev` : null,

        // Generic host vars
        env.HOST,
        env.HOSTNAME
    ];

    for (const c of candidates) {
        const normalized = normalizeHostname(c);
        if (normalized) return normalized;
    }

    return null;
}

/**
 * Read fingerprint from disk if it exists and looks valid.
 */
function readFingerprint(): Nullable<string> {
    try {
        if (!fs.existsSync(FINGERPRINT_FILE)) return null;
        const val = fs.readFileSync(FINGERPRINT_FILE, 'utf8').trim();
        if (!val) return null;

        // Keep it strict: hex only, length 32 (16 bytes) or 64 (32 bytes)
        if (!/^[a-f0-9]{32}$/.test(val) && !/^[a-f0-9]{64}$/.test(val)) return null;

        return val;
    } catch {
        return null;
    }
}

/**
 * Create and persist a stable fingerprint.
 */
function createAndPersistFingerprint(): string {
    const fp = crypto.randomBytes(16).toString('hex'); // 32 hex chars
    try {
        fs.mkdirSync(FINGERPRINT_DIR, { recursive: true });
        fs.writeFileSync(FINGERPRINT_FILE, fp, 'utf8');
    } catch {
        // Even if write fails, return generated fingerprint for this runtime.
    }
    return fp;
}

/**
 * Resolve the domain for DevPayr requests:
 * - If user supplies domain → sanitize and use it if valid
 * - Else try environment-based inference
 * - Else load or generate stable fingerprint
 */
export function resolveDevPayrDomain(userSuppliedDomain: unknown): string {
    const fromUser = normalizeHostname(userSuppliedDomain);
    if (fromUser) return fromUser;

    const inferred = inferDomainFromEnvironment();
    if (inferred) return inferred;

    const existingFp = readFingerprint();
    if (existingFp) return existingFp;

    return createAndPersistFingerprint();
}

export const requiredConfig = { // Required: Base API endpoint
    secret: null as Nullable<string>,            // Required: AES secret used for decrypting injectables

    /**
     * Domain is required by DevPayr when domain-aware checks are enabled.
     * If user doesn't provide it, we attempt inference from environment.
     * If we still can't infer a valid hostname, we generate a stable fingerprint.
     */
    domain: null as Nullable<string>
};

export const defaultConfig = {
    base_url: 'https://api.devpayr.dev/api/v1/',
    // License & Validation
    recheck: true,                        // Use cached validation or revalidate on each request
    license: null as Nullable<string>,    // License key (used for runtime validation)
    api_key: null as Nullable<string>,    // Optional: For authenticated API calls (project creation, etc.)

    // Behavior Config
    action: 'check_project',              // Optional: identifier for the validation source
    timeout: 5000,                        // Request timeout (in milliseconds)
    per_page: null as Nullable<number>,   // Optional: used for listing APIs

    // Injectable Handling
    injectables: true,                    // Whether to fetch injectables
    injectablesVerify: true,              // Verify HMAC signature of injectables
    injectablesPath: null as Nullable<string>, // Base path to save or inject injectables (null = system default)
    handleInjectables: false,             // Whether SDK should automatically apply injectables
    injectablesProcessor: null as any,    // Optional: function or class to process injectables

    // Invalid License Handling
    invalidBehavior: 'modal',             // 'log' | 'modal' | 'redirect' | 'silent'
    redirectUrl: null as Nullable<string>,// Where to redirect on invalid license (if applicable)
    customInvalidMessage: 'This copy is not licensed for production use.',
    customInvalidView: null as Nullable<string>,
    cachePath: null,

    // Hooks
    onReady: null as ((response: any) => void) | null
};
