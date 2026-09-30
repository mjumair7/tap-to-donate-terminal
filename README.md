# Tap-to-Donate Terminal

A small event-facing donation terminal with a server-side Stripe boundary and a browser flow that supports Stripe Terminal's simulated reader in test mode.

## Safe default

Without `STRIPE_SECRET_KEY`, the app runs in an explicit mock mode. No card data is requested, no payment is created, and the interface labels the result as simulated.

```sh
npm start
# open http://127.0.0.1:8787
```

## Stripe test mode

```sh
export STRIPE_SECRET_KEY=sk_test_...
npm start
```

Then choose an amount and press **Simulate terminal tap**. The browser uses Stripe Terminal.js, asks the server for a short-lived connection token, connects to a simulated reader, and processes a test-mode `card_present` PaymentIntent.

For WisePOS E or another physical reader, register the reader in Stripe, serve the site over HTTPS, and change `discoverReaders({ simulated: true })` to the appropriate location-based discovery flow. Never place the secret key in browser code.

## Test

```sh
npm test
```

This sample does not issue tax receipts, store donor identities, or claim that a mock-mode donation succeeded.

MIT licensed.
