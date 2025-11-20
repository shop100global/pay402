import { Request, Response, NextFunction } from 'express';
interface Pay402Config {
    nanoAppId: string;
    nanoAppSecret: string;
    _100PayApiKey: string;
    wallet: string;
    facilitator?: {
        url: string;
        apiKey?: string;
    };
    network?: string;
    routes: Pay402Route[];
    tools?: any[];
}
interface Pay402Context {
    body: any;
    route: {
        params: {
            [key: string]: string;
        };
        query: any;
        path: string;
        method: string;
        originalUrl: string;
    };
    headers: any;
}
interface Pay402Route {
    name: string;
    description: string;
    path: string;
    method: string;
    pricing: 'fixed' | 'dynamic';
    price: (req: Pay402Context) => Promise<{
        amount: string;
        currency: string;
        symbol: string;
    }>;
    [key: string]: any;
}
export declare const withPay402: (config: Pay402Config) => (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export {};
