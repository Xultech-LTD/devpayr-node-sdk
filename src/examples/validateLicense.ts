// src/examples/validateLicense.ts

import { DevPayr } from '../core/DevPayr';

async function main(): Promise<void> {
    await DevPayr.bootstrap({
        license: '019ae9f4-18b2-706b-b728-3f77c6bd9217', // Replace with a real key
        domain: 'localhost.test',
        injectables: true,
        debug: true,
        timeout: 5000,

        // Required: used to decrypt injectables (use your real AES secret in production)
        secret: 'YOUR_AES_SECRET',

        onReady: (response: any) => {
            console.log('✅ License validated successfully.');
            console.log('Response:', response?.data ?? response);
        },

        invalidBehavior: 'log' // modal | redirect | log | silent
    });
}

main().catch((err) => {
    console.error('❌ DevPayr example failed:', err?.message ?? err);
    process.exitCode = 1;
});
