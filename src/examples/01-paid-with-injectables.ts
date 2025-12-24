import { DevPayr } from '../core/DevPayr';

async function main() {
    await DevPayr.bootstrap({
        license: '019ae9f4-18b2-706b-b728-3f77c6bd9217',
        base_url: 'https://api.devpayr.dev/api/v1/',
        domain: 'paid.localhost.test',
        injectables: true,
        handleInjectables: false, // keep false so we just inspect payload first
        recheck: true,
        debug: true,
        secret: 'YOUR_AES_SECRET',
        invalidBehavior: 'log',
        onReady: (res: any) => {
            console.log('✅ PAID + INJECTABLES: onReady fired');
            const data = res?.data ?? res;
            console.log('has_paid:', data?.has_paid);
            console.log('injectables_count:', Array.isArray(data?.injectables) ? data.injectables.length : 0);
            console.log('payload:', data);
        },
    });
}

main().catch((e) => {
    console.error('❌ Example failed:', e?.message ?? e);
    process.exitCode = 1;
});
