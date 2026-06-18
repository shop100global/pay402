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
interface Pay402Price {
    amount: string;
    currency: string;
    symbol: string;
    type: 'fixed' | 'dynamic';
}
type Pay402PriceConfig = Pay402Price | ((req: Pay402Context) => Pay402Price | Promise<Pay402Price>);
interface Pay402Route {
    name: string;
    description: string;
    path: string;
    method: string;
    price: Pay402PriceConfig;
    [key: string]: any;
}
export declare const withPay402: (config: Pay402Config) => (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export {};
