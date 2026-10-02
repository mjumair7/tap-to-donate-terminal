import test from "node:test";
import assert from "node:assert/strict";
import {
  createConnectionToken,
  createPaymentIntent,
  validateDonation,
  validateStripeSecretKey,
} from "../src/stripe-boundary.js";

test("accepts configured donation amounts", () => {
  assert.equal(validateDonation(500), 500);
  assert.equal(validateDonation(2000), 2000);
});

test("rejects arbitrary and malformed amounts", () => {
  assert.throws(() => validateDonation(501));
  assert.throws(() => validateDonation("500"));
  assert.throws(() => validateDonation(-500));
});

test("mock mode is explicit and does not return a client secret", async () => {
  const result = await createPaymentIntent(1000, "");
  assert.equal(result.mock, true);
  assert.equal(result.clientSecret, null);
  assert.equal(result.amount, 1000);
});

test("refuses live-mode and malformed Stripe keys", async () => {
  assert.throws(() => validateStripeSecretKey("sk_live_do_not_use"), /test-mode/);
  assert.throws(() => validateStripeSecretKey("not-a-key"), /test-mode/);
  await assert.rejects(() => createConnectionToken("sk_live_do_not_use"), /test-mode/);
  await assert.rejects(() => createPaymentIntent(1000, "sk_live_do_not_use"), /test-mode/);
});

test("accepts a test-mode key without exposing it", () => {
  assert.equal(validateStripeSecretKey("sk_test_example"), "sk_test_example");
});
