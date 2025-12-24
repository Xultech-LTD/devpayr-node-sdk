import { DevPayr } from '../core/DevPayr';

async function run(domain: string) {
    await DevPayr.bootstrap({
        license: '019ae9f4-18b2-706b-b728-3f77c6bd9217',
        base_url: 'https://api.devpayr.dev/api/v1/',
        domain,
        injectables: false,
        recheck: false, // cache should be used after success
        debug: true,
        secret: 'YOUR_AES_SECRET',
        invalidBehavior: 'log',
        onReady: (res: any) => {
            console.log(`✅ CACHE TEST onReady (${domain})`);
            console.log('cached?:', res?.cached === true);
            console.log('message:', res?.message);
        },
    });
}

async function main() {
    console.log('--- Run 1 (should hit API, then cache) ---');
    await run('domain-a.test');

    console.log('--- Run 2 same domain (should be cached) ---');
    await run('domain-a.test');

    console.log('--- Run 3 different domain (should NOT be cached) ---');
    await run('domain-b.test');
}

main().catch((e) => {
    console.error('❌ Example failed:', e?.message ?? e);
    process.exitCode = 1;
});
