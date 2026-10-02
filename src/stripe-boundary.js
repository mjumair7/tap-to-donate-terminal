const ALLOWED_AMOUNTS = new Set([500, 1000, 2000]);

export function validateStripeSecretKey(secretKey) {
  if (!secretKey) return "";
  if (!secretKey.startsWith("sk_test_")) {
    throw new Error("Only a Stripe test-mode secret key is accepted");
  }
  return secretKey;
}

export function validateDonation(amount) {
  if (!Number.isInteger(amount) || !ALLOWED_AMOUNTS.has(amount)) {
    throw new Error("Choose one of the configured donation amounts");
  }
  return amount;
}

async function stripeRequest(path, body, secretKey) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || "Stripe request failed");
  return payload;
}

export async function createConnectionToken(secretKey) {
  if (!secretKey) return { mock: true, secret: null };
  const testKey = validateStripeSecretKey(secretKey);
  const token = await stripeRequest("terminal/connection_tokens", {}, testKey);
  return { mock: false, secret: token.secret };
}

export async function createPaymentIntent(amount, secretKey) {
  validateDonation(amount);
  if (!secretKey) {
    return {
      mock: true,
      id: `pi_mock_${amount}`,
      clientSecret: null,
      amount,
      currency: "cad",
    };
  }

  const testKey = validateStripeSecretKey(secretKey);

  const intent = await stripeRequest(
    "payment_intents",
    {
      amount: String(amount),
      currency: "cad",
      "payment_method_types[]": "card_present",
      capture_method: "automatic",
      description: "Event donation",
    },
    testKey,
  );
  return {
    mock: false,
    id: intent.id,
    clientSecret: intent.client_secret,
    amount: intent.amount,
    currency: intent.currency,
  };
}
