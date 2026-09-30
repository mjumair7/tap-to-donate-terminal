import test from "node:test";
import assert from "node:assert/strict";
import { createPaymentIntent, validateDonation } from "../src/stripe-boundary.js";

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
