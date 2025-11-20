import { withPay402 } from '../src/index';
import { Request, Response, NextFunction } from 'express';

const config = {
    nanoAppId: "test-app",
    nanoAppSecret: "secret",
    _100PayApiKey: "key",
    wallet: "0x123",
    routes: [
        {
            name: "Test Route",
            description: "Test",
            path: "/test",
            method: "GET",
            pricing: "fixed" as const,
            price: async (req: any) => ({ amount: "10", currency: "USD", symbol: "$" })
        }
    ]
};

const middleware = withPay402(config);

console.log("Middleware created successfully");
