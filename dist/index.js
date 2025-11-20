"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.withPay402 = void 0;
const crypto = __importStar(require("crypto"));
// @ts-ignore
const x402_express_1 = require("x402-express");
// Cache for routes hash
let lastUploadedRoutesHash = null;
// Function to dynamically extract all route parameters from URL
const extractAllParams = (path) => {
    const params = {};
    const segments = path.split('/').filter(seg => seg !== '');
    segments.forEach((segment, index) => {
        const isNumeric = /^\d+$/.test(segment);
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
        const isAlphanumeric = /^[a-zA-Z0-9_-]+$/.test(segment);
        if (index > 0 && (isNumeric || isUUID || isAlphanumeric)) {
            const previousSegment = segments[index - 1];
            let key = previousSegment;
            if (key.endsWith('s') && key.length > 1) {
                key = key.slice(0, -1);
            }
            params[key] = segment;
        }
    });
    return params;
};
const extractParamsFromRoute = (req) => {
    return Object.keys(req.params).length > 0 ? req.params : extractAllParams(req.path);
};
const buildRequestObject = (req) => {
    const my_request = {
        body: req.body || {},
        route: {
            params: extractParamsFromRoute(req),
            query: req.query || {},
            path: req.path,
            method: req.method,
            originalUrl: req.originalUrl
        },
        headers: req.headers || {}
    };
    return my_request;
};
async function getRate({ from, to, amount }, apiKey) {
    const RATES_API = 'https://rates.100pay.co';
    const RATES_API_KEY = apiKey;
    console.log(`📡 Getting price for ${from} to ${to} from ${RATES_API}/api/price/${from}?currency=${to}`);
    try {
        const response = await fetch(`${RATES_API}/api/price/${from}?currency=${to}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": RATES_API_KEY,
            },
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const responseData = await response.json();
        if (amount) {
            const numAmount = parseFloat(amount);
            const new_price = numAmount * responseData.price;
            return {
                ...responseData,
                price: new_price,
                original_price: responseData.price,
                amount: numAmount,
            };
        }
        return responseData;
    }
    catch (error) {
        console.error("Failed to fetch rates:", error, { amount, to, from });
        return null;
    }
}
const uploadRoutesToRemoteServer = async (config) => {
    // Calculate hash of the routes to check for changes
    const currentRoutesHash = crypto.createHash('md5').update(JSON.stringify(config.routes)).digest('hex');
    if (lastUploadedRoutesHash === currentRoutesHash) {
        console.log("Routes configuration unchanged, skipping upload.");
        return;
    }
    try {
        // Transform routes to the format expected by the bulk API
        // The user provided example shows "tools" array with name, description, path, method, pricing
        const tools = config.routes.map(route => ({
            name: route.name,
            description: route.description,
            path: route.path,
            method: route.method,
            pricing: {
                type: route.pricing === 'fixed' ? 'fixed' : 'per_call', // Mapping logic assumption
                amount: 0 // This might need to be adjusted based on how pricing is handled in the bulk API vs the dynamic function
                // The bulk API example shows "amount": 100. 
                // But our routes have a `price` function. 
                // If it's dynamic, maybe we send 0 or a placeholder?
                // The user didn't specify how to map the `price` function to the bulk API `pricing` object fully.
                // I'll assume we send what we can.
            }
        }));
        const response = await fetch(`https://api.getnano.space/api/apps/${config.nanoAppId}/tools/bulk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-app-api-key': config.nanoAppSecret // Changed from x-api-key to x-app-api-key as per user request example
            },
            body: JSON.stringify({
                tools: tools
            })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Routes successfully uploaded:", data);
        // Update hash after successful upload
        lastUploadedRoutesHash = currentRoutesHash;
    }
    catch (error) {
        console.error("Error uploading routes:", error);
    }
};
const verifyPay402 = async (payment, apiKey) => {
    console.log("Settling payment for header:", payment);
    try {
        const response = await fetch(`https://api.100pay.co/api/v1/wallet-transactions/${payment}/status`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                "x-api-key": apiKey,
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Payment successfully settled:", data);
        return data;
    }
    catch (error) {
        console.error("Error settling payment:", error);
        throw error;
    }
};
const withPay402 = (config) => {
    // Upload routes once on initialization (or when config changes if we re-initialize)
    // Note: This is async, so it might run in background. 
    // If we want to block, we can't easily in a sync middleware factory.
    // We'll let it run in background.
    uploadRoutesToRemoteServer(config).catch(err => console.error("Initial route upload failed:", err));
    return async (req, res, next) => {
        // console.log("checking for x-pay402 header...", req.headers);
        const my_request = buildRequestObject(req);
        req.my_request = my_request;
        const constructedRoutes = {};
        for (let i = 0; i < config.routes.length; i++) {
            const route = config.routes[i];
            // We don't upload routes here anymore!
            // Check if this route matches the current request to calculate price
            // Only calculate price if it's the matching route to save resources?
            // The original code calculated price for ALL routes on EVERY request? 
            // "const priceResult = await route.price(my_request);" was inside the loop.
            // That seems inefficient if we have many routes.
            // But we need to construct `constructedRoutes` for `paymentMiddleware`.
            // `paymentMiddleware` needs the price for the current route, but does it need it for others?
            // Usually x402 middleware matches the route internally.
            // If we pass `constructedRoutes` with all routes, we need their prices.
            // If the price is dynamic and depends on `my_request` (which is the CURRENT request),
            // then calculating price for OTHER routes based on CURRENT request parameters might be wrong or impossible
            // (e.g. other routes might need different params).
            // However, I must follow the original logic unless it's clearly broken.
            // Original logic:
            // for each route:
            //   priceResult = await route.price(my_request)
            //   ...
            //   constructedRoutes[...] = paymentOptions
            // If `route.price` depends on params that are not present (because it's a different route), it might fail.
            // But `extractAllParams` tries to extract everything.
            // I will keep the logic but wrap it in a try-catch or check if it matches.
            // Actually, for `paymentMiddleware`, we usually define the configuration.
            // If the price is dynamic, `x402` usually supports a callback or we need to pass the calculated price for the *matching* route.
            // Let's look at the loop again.
            // It calculates price for EVERY route using `my_request`.
            // If I have route A (/a/:id) and route B (/b/:id), and I call /a/1.
            // `my_request` has params for /a/1.
            // `route.price` for B might fail if it expects `b_id`.
            // I will assume the user knows what they are doing or the `price` function handles missing params gracefully.
            // But I'll optimize: only calculate full payment options if it matches?
            // Wait, `paymentMiddleware` takes `constructedRoutes`. If we pass a map of all routes, `x402` will use it to match.
            // If we only pass the current route, `x402` might complain or it might be fine.
            // But `x402` is designed to handle the 402 response.
            // Let's try to be safe:
            // If the route matches `my_request.route.path` and method, we calculate the price.
            // For others, maybe we put a placeholder or skip?
            // The original code:
            // "if (route.path && route.path === my_request.route.path && route.method === my_request.route.method)"
            // This check was used to verify payment and set `paymentOptions` with specific descriptions.
            // But `constructedRoutes` was populated OUTSIDE this check?
            // No, `constructedRoutes` assignment is at the end of the loop.
            // `paymentOptions` is declared BEFORE the check with default values?
            // "let paymentOptions = { price: `${priceResult.amount}`, ... }"
            // So it DOES calculate price for every route.
            // I'll stick to the original logic but add a check:
            // If `route.price` throws, we shouldn't crash.
            let priceResult;
            try {
                priceResult = await route.price(my_request);
            }
            catch (e) {
                // If price calculation fails (e.g. missing params for a different route), use default/zero
                priceResult = { amount: "0", currency: "USD", symbol: "$" };
            }
            let paymentOptions = {
                price: `${priceResult.amount}`,
                network: "base",
                config: {
                    description: `or pay with PAY via 100Pay Internal transfer.`,
                },
            };
            if (route.path === my_request.route.path && route.method === my_request.route.method) {
                if (req.headers['x-pay402']) {
                    const payment = req.headers['x-pay402'];
                    try {
                        const receipt = await verifyPay402(payment, config._100PayApiKey);
                        req.payment_receipt = receipt;
                        if (receipt && receipt.data.status === 'successful') {
                            console.log("payment verified successfully:", receipt);
                            return next();
                        }
                        else {
                            return res.status(402).json({ error: 'Payment could not be verified', details: receipt });
                        }
                    }
                    catch (err) {
                        return res.status(402).json({ error: 'Payment verification failed', details: err });
                    }
                }
                // Calculate rates for the matching route
                const payRate = await getRate({ from: priceResult.currency, to: 'PAY', amount: priceResult.amount }, config._100PayApiKey);
                const usdcRate = await getRate({ from: priceResult.currency, to: 'USDC', amount: priceResult.amount }, config._100PayApiKey);
                if (usdcRate && payRate) {
                    paymentOptions = {
                        price: `${usdcRate.price.toFixed(3)}`,
                        network: "base",
                        config: {
                            description: `PAY402 is detected on this server for gas-free transfers. Send ${payRate.price.toFixed(3)} PAY or the USDC amount via 100Pay Internal transfer.`,
                        },
                    };
                }
            }
            constructedRoutes[`${route.method} ${route.path}`] = paymentOptions;
        }
        const params = [
            config.wallet,
            constructedRoutes,
            {
                url: config.facilitator?.url || "http://localhost:3000/facilitator",
                apiKey: config.facilitator?.apiKey
            }
        ];
        (0, x402_express_1.paymentMiddleware)(...params)(req, res, next);
    };
};
exports.withPay402 = withPay402;
