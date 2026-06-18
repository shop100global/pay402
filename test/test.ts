import { withPay402 } from '../src/index';

const config = {
    nanoAppId: "test-app",
    nanoAppSecret: "secret",
    _100PayApiKey: "key",
    wallet: "0x123",
    routes: [
        {
            name: 'Get Spot Tickers',
            description: 'Returns all spot market tickers with last price, 24h volume, high/low, and percentage change.',
            path: '/spot/tickers',
            method: 'GET',
            price: { amount: '0.20', currency: 'USD', symbol: '$', type: 'fixed' as const }
        },
        // Dynamic pricing still supported via a function
        {
            name: 'Dynamic Route',
            description: 'A route with request-time pricing.',
            path: '/dynamic',
            method: 'GET',
            price: async (req: any) => ({ amount: "10", currency: "USD", symbol: "$", type: "dynamic" as const })
        }
    ]
};

const middleware = withPay402(config);

if (typeof middleware !== 'function') {
    console.error("FAIL: withPay402 did not return a middleware function");
    process.exit(1);
}

console.log("PASS: Middleware created successfully with new route config");
