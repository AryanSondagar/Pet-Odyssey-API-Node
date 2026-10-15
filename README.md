# Pet Odyssey API

Express 5 API for the Pet Odyssey Angular application. MongoDB is accessed with Mongoose; product/pet images use Cloudinary and payments use Stripe.

## Requirements

- Node.js compatible with the versions in `package.json`
- MongoDB
- Stripe test/live API key
- Cloudinary credentials to enable image uploads

## Setup

```sh
npm install
npm run dev
```

Create `.env` in this directory:

```dotenv
PORT=3000
MONGO_URI=<MongoDB connection string>
JWT_SECRET=<long random secret>
STRIPE_SECRET_KEY=<Stripe API secret key>
STRIPE_WEBHOOK_SECRET=<Stripe webhook signing secret>
CLIENT_ORIGIN=http://localhost:4200
# Set only when deployed behind a trusted proxy; use its exact hop count.
# TRUST_PROXY_HOPS=1
```

Image uploads require either `CLOUDINARY_URL` or `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. Keep credentials out of source control.

Set `CLIENT_ORIGIN` to the exact frontend origin(s), comma-separated. Unsafe browser requests require an allowed `Origin` and valid CSRF cookie/header pair. Production cookies require HTTPS.
Helmet sets security response headers. Its cross-origin resource policy permits the separately hosted frontend to load API-served resources. Set `TRUST_PROXY_HOPS` to the number of trusted reverse-proxy hops in the deployment; do not enable proxy trust without matching the actual topology.

Login, registration, and refresh are rate-limited by client IP. The default limiter uses process-local memory, so deployments with multiple API instances should configure a shared rate-limit store. Request bodies for auth, payment/order creation, and catalog mutations are validated with Zod; invalid bodies receive HTTP 400 with field-level issue details. Multipart catalog numeric fields are parsed and validated after upload parsing.

## Payment flow

- Authenticated clients call `POST /api/payment/create-intent` with `items: [{ type: "product" | "course", itemId, quantity }]` and optional `tipAmount` in INR. The API validates the item IDs and quantities, resolves catalog prices, calculates tax and total in paise, creates a pending order, and returns a Stripe Payment Intent client secret. Client-supplied `amount` or `currency` values are rejected.
- The Angular client confirms the Payment Intent using Stripe.js.
- Configure Stripe to send `payment_intent.succeeded`, `payment_intent.payment_failed`, and `payment_intent.canceled` events to `POST /api/payment/webhook`.
- The webhook uses the original raw request body and validates `Stripe-Signature` with `STRIPE_WEBHOOK_SECRET`. It verifies the order reference, Payment Intent ID, currency, and amount.
- On success, a MongoDB transaction records the unique Stripe event ID, atomically decrements each product's stock only when enough stock remains, and marks the matching order paid. A stock race fails the order without partial stock changes and triggers an idempotent Stripe refund. Refund failures remain recorded for retry on Stripe's duplicate delivery.
- Failed or canceled Payment Intents mark pending orders failed. Pending orders expire after 24 hours through a partial TTL index; terminal paid/failed orders are retained.
- The webhook is a server-to-server endpoint and does not use browser cookies, Origin, or CSRF tokens.

## Other API routes

- `/api/auth` — registration, login, CSRF token, refresh, and logout
- `/api/users` — user profile and admin check
- `/api/admin/adoption` — pet listings and adoption applications
- `/api/admin/course` — course listings
- `/api/admin/marketplace` — product listings
- `GET /api/orders` — paginated order history for the authenticated user
- `GET /api/admin/orders` — paginated order list for administrators
- `/health` — API and database status

Catalog reads are public. Administrative mutations and the admin-wide order list require an authenticated admin session. Payment Intent creation and personal order history require an authenticated user.

## Tests

```sh
npm test
```

Payment transactions require MongoDB replica-set support. Integration tests use `mongodb-memory-server` to exercise persisted order creation, successful/failed/canceled webhook transitions, durable duplicate detection, refund retry, user/admin order history, and concurrent purchases competing for the final stock unit. Other tests cover refresh-token replay, CSRF and Origin enforcement, payment route authentication, server-side pricing, Zod request validation, and rate-limit responses.
