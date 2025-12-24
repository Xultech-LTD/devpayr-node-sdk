import { DevPayr } from '../core/DevPayr';

async function main() {
    await DevPayr.bootstrap({
        license: '019ae9f4-18b2-706b-b728-3f77c6bd9219',
        base_url: 'https://api.devpayr.dev/api/v1/',
        domain: 'unpaid.localhost.test',
        injectables: true,
        recheck: true,
        debug: true,
        secret: 'YOUR_AES_SECRET',
        invalidBehavior: 'log',
        customInvalidMessage: '❌ UNPAID: project/domain is not paid.',
        onReady: () => {
            console.log('⚠️ This should NOT run for unpaid license.');
        },
    });
}

main().catch((e) => {
    console.error('❌ Example failed:', e?.message ?? e);
    process.exitCode = 1;
});
