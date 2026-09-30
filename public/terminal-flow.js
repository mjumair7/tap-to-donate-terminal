const amountButtons = [...document.querySelectorAll("[data-amount]")];
const tapButton = document.querySelector("[data-tap]");
const title = document.querySelector("[data-screen-title]");
const detail = document.querySelector("[data-screen-detail]");
const screen = document.querySelector(".terminal-screen");
const modeLabel = document.querySelector("[data-mode]");
let selectedAmount = null;
let terminal = null;
let stripeMode = false;

function show(nextTitle, nextDetail, approved = false) {
  title.textContent = nextTitle;
  detail.textContent = nextDetail;
  screen.classList.toggle("approved", approved);
}

async function post(path, body = {}) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Request failed");
  return payload;
}

async function initializeTerminal() {
  const probe = await post("/api/connection-token");
  stripeMode = !probe.mock;
  if (!stripeMode) {
    modeLabel.textContent = "MOCK MODE · no payment will be created";
    return;
  }
  if (!window.StripeTerminal) throw new Error("Stripe Terminal.js did not load");
  terminal = window.StripeTerminal.create({
    onFetchConnectionToken: async () => (await post("/api/connection-token")).secret,
    onUnexpectedReaderDisconnect: () => show("Reader disconnected", "Reconnect before accepting another donation"),
  });
  const discovered = await terminal.discoverReaders({ simulated: true });
  if (discovered.error || !discovered.discoveredReaders.length) throw discovered.error || new Error("No simulated reader found");
  const connected = await terminal.connectReader(discovered.discoveredReaders[0]);
  if (connected.error) throw connected.error;
  modeLabel.textContent = "STRIPE TEST MODE · simulated reader connected";
}

amountButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedAmount = Number(button.dataset.amount);
    amountButtons.forEach((item) => item.classList.toggle("selected", item === button));
    show(`$${(selectedAmount / 100).toFixed(2)}`, "Ready for simulated tap");
    tapButton.disabled = false;
  });
});

tapButton.addEventListener("click", async () => {
  tapButton.disabled = true;
  show("Reading card…", stripeMode ? "Stripe simulated reader" : "Local mock flow");
  try {
    const intent = await post("/api/payment-intents", { amount: selectedAmount });
    if (intent.mock) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      show("Mock approved", `$${(selectedAmount / 100).toFixed(2)} · no payment created`, true);
    } else {
      const collected = await terminal.collectPaymentMethod(intent.clientSecret);
      if (collected.error) throw collected.error;
      const processed = await terminal.processPayment(collected.paymentIntent);
      if (processed.error) throw processed.error;
      show("Test payment approved", `$${(selectedAmount / 100).toFixed(2)} · ${processed.paymentIntent.id}`, true);
    }
  } catch (error) {
    show("Could not complete", error.message);
  } finally {
    tapButton.disabled = false;
  }
});

initializeTerminal().catch((error) => {
  modeLabel.textContent = `TERMINAL UNAVAILABLE · ${error.message}`;
});
