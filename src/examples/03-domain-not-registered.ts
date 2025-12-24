import { DevPayr } from '../core/DevPayr';

async function main() {
    await DevPayr.bootstrap({
        license: '019ae9f4-18b2-706b-b728-3f77c6bd9217',
        base_url: 'https://api.devpayr.dev/api/v1/',
        domain: 'not-registered.test',
        injectables: false,
        recheck: true,
        debug: true,
        secret: 'YOUR_AES_SECRET',
        invalidBehavior: 'log',
        customInvalidMessage: '❌ DOMAIN NOT REGISTERED: this domain is not allowed under the project.',
        onReady: () => {
            console.log('⚠️ This should NOT run when domain is not registered.');
        },
    });
}

main().catch((e) => {
    console.error('❌ Example failed:', e?.message ?? e);
    process.exitCode = 1;
});
