# [PAY402](https://402.finance)

[PAY402](https://402.finance) is a payment protocol middleware for Express that integrates with the x402 protocol by Coinbase. It enables gas-free crypto and stablecoin payments for your API routes, settling directly to your bank account via 100Pay.

## Features

- **Gas-free Payments**: Supports payments across 8 blockchains.
- **Automatic Settlement**: Payments are settled in stablecoins or fiat to your bank account.
- **Express Middleware**: Easy integration with existing Express applications.
- **Bulk Route Upload**: Automatically uploads your route configurations to the NanoApps Store, making it discoverable to nanochat and other ai agents like claude, chatgpt, gemini, cursur, kiro, antigravity, codex, etc.
- **Smart Caching**: Only uploads route configurations when changes are detected, optimizing startup time.
- **TypeScript Support**: Written in TypeScript with full type definitions.

## Installation

```bash
npm npm i @100pay-hq/pay402 x402-express
```

## Usage

### 1. Configuration

Create a configuration object for your application. You'll need credentials from your NanoApps console and 100Pay dashboard.

```typescript
import express from 'express';
import { withPay402 } from '@100pay-hq/pay402';

const app = express();

const nanoAppConfig = {
    nanoAppId: "your-nanoapp-id", // From NanoApps console
    nanoAppSecret: "your-nanoapp-secret", // From NanoApps console
    _100PayApiKey: "your-100pay-api-key", // From 100Pay dashboard
    wallet: "0xYourWalletAddress", // Your 100Pay checkout wallet (EVM or Solana)
    facilitator: {
        url: "https://x402.org/facilitator", // Optional x402 facilitator endpoint
        apiKey: "your-facilitator-api-key" // Optional
    },
    network: "base", // e.g., "base", "solana"
    routes: [
        {
            name: "Search Products",
            description: "Search for products in the catalog.",
            path: "/api/search",
            method: "GET",
            pricing: "fixed",
            price: async (req) => {
                return {
                    amount: "1",
                    currency: "USD",
                    symbol: "$"
                };
            }
        },
        {
            name: "Pay for Order",
            description: "Pay for a specific order.",
            path: "/api/pay-for-order",
            method: "POST",
            pricing: "dynamic",
            price: async (req) => {
                // Access route parameters via req.route.params
                // const orderId = req.route.params.order_id;
                return {
                    amount: "20",
                    currency: "NGN",
                    symbol: "N"
                };
            }
        }
    ]
};

// Apply the middleware
app.use(withPay402(nanoAppConfig));

// Define your actual routes
app.get('/api/search', (req, res) => {
    res.json({ data: "Search results..." });
});

app.post('/api/pay-for-order', (req, res) => {
    res.json({ status: "Order paid!" });
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
```

### 2. Route Configuration

Each route in the `routes` array must have the following properties:

- `name`: Human-readable name of the tool/route.
- `description`: Description for AI agents or users.
- `path`: The Express route path (e.g., `/api/users/:id`).
- `method`: HTTP method (`GET`, `POST`, `PUT`, `DELETE`, etc.).
- `pricing`: `'fixed'` or `'dynamic'`.
- `price`: An async function that returns the price object `{ amount, currency, symbol }`. It receives a context object containing `body`, `route` (params, query, path), and `headers`.

### 3. Payment Verification

The middleware automatically handles:
1.  Intercepting requests to configured routes.
2.  Calculating the price (converting to PAY/USDC if needed).
3.  Returning a 402 Payment Required response with payment options if no payment is provided.
4.  Verifying the `x-pay402` header with 100Pay.
5.  Attaching the payment receipt to `req.payment_receipt`.

## License

ISC
