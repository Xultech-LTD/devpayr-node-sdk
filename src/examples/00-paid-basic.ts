import { DevPayr } from '../core/DevPayr';

async function main() {
    await DevPayr.bootstrap({
        license: '019ae9f4-18b2-706b-b728-3f77c6bd9217',
        domain: 'localhost.test',
        injectables: true,
        recheck: false,
        secret: 'YOUR_AES_SECRET',
        invalidBehavior: 'log',
        onReady: (res: any) => {
            console.log('✅ PAID BASIC: onReady fired');
            console.log('Response:', res?.data ?? res);
        },
        cachePath: './cache/devpayr'
    });
}

main().catch((e) => {
    console.error('❌ Example failed:', e?.message ?? e);
    process.exitCode = 1;
});
