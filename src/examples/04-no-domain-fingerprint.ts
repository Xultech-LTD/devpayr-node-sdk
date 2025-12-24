import { DevPayr } from '../core/DevPayr';

async function main() {
    await DevPayr.bootstrap({
        license: '019ae9f4-18b2-706b-b728-3f77c6bd9217',
        base_url: 'https://api.devpayr.dev/api/v1/',
        // domain intentionally omitted
        injectables: false,
        recheck: true,
        debug: true,
        secret: 'YOUR_AES_SECRET',
        invalidBehavior: 'log',
        onReady: (res: any) => {
            console.log('✅ FINGERPRINT MODE: onReady fired');
            console.log('Resolved domain/fingerprint:', DevPayr.config().get('domain'));
            console.log('Response:', res?.data ?? res);
        },
    });
}

main().catch((e) => {
    console.error('❌ Example failed:', e?.message ?? e);
    process.exitCode = 1;
});
