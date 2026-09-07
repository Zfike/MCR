/**
 * Missed-Call Recovery Demo
 *
 * Demo flow:
 *   1. Customer calls the Twilio number.
 *   2. Twilio rings the business phone.
 *   3. If the call is missed, the customer receives an SMS.
 *   4. The missed call is stored in memory and shown on the dashboard.
 *
 * This is a demo only. Replace the in-memory `leads` array with a
 * database before using this with real customers.
 */
require("dotenv").config();

const express = require("express");
const twilio = require("twilio");
const path = require("path");

const app = express();

// -----------------------------------------------------------------------------
// Middleware
// -----------------------------------------------------------------------------

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const PORT = process.env.PORT || 3000;

const BUSINESS_PHONE =
  process.env.BUSINESS_PHONE || "+15555550123";

const TWILIO_NUMBER =
  process.env.TWILIO_NUMBER || "+15555559999";

const BUSINESS_NAME =
  process.env.BUSINESS_NAME || "Metro HVAC & Air";

const RING_TIMEOUT_SECONDS = parseInt(
  process.env.RING_TIMEOUT_SECONDS || "20",
  10
);

const BOOKING_LINK =
  process.env.BOOKING_LINK || "https://example.com/book";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

// TODO: Wire to Twilio account
const twilioClient =
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
    ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    : null;

// TODO: Choose and wire to a database
const leads = [];

// ---------------------------------------------------------
// Twilio Voice Webhooks
// ---------------------------------------------------------

// -----------------------------------------------------------------------------
// Twilio Voice: Incoming Call
// -----------------------------------------------------------------------------

/**
 * Twilio sends the incoming call here.
 *
 * The caller is connected to the business phone. If the business
 * does not answer within RING_TIMEOUT_SECONDS, Twilio calls
 * /voice/dial-result.
 */
app.post("/voice/incoming", (req, res) => {
  const { From, CallSid } = req.body;

  console.log(
    `[incoming] call from ${From} (CallSid ${CallSid})`
  );

  const twiml = new twilio.twiml.VoiceResponse();

  const dial = twiml.dial({
    timeout: RING_TIMEOUT_SECONDS,
    action: "/voice/dial-result",
    method: "POST",
  });

  dial.number(BUSINESS_PHONE);

  res.type("text/xml").send(twiml.toString());
});

// -----------------------------------------------------------------------------
// Twilio Voice: Dial Result
// -----------------------------------------------------------------------------

/**
 * Twilio calls this endpoint after attempting to connect the caller
 * to the business phone.
 *
 * If the business answered, we do nothing.
 * Otherwise, we create a lead and send the recovery SMS.
 */
app.post("/voice/dial-result", async (req, res) => {
  const {
    From,
    DialCallStatus,
    CallSid,
  } = req.body;

  console.log(
    `[dial-result] ${CallSid} from ${From} -> ${DialCallStatus}`
  );

  const twiml = new twilio.twiml.VoiceResponse();

  // The business answered the call.
  if (DialCallStatus === "completed") {
    res.type("text/xml").send(twiml.toString());
    return;
  }

  // The call was not answered.
  const lead = createLead({
    from: From,
    status: DialCallStatus || "unknown",
  });

  leads.unshift(lead);

  await sendRecoveryText(
    From,
    lead.textBody,
    lead
  );

  // Give the caller a final voice message before hanging up.
  twiml.say(
    { voice: "alice" },
    "Sorry we missed your call. We just texted you at this number. Reply anytime and we'll get right back to you."
  );

  res.type("text/xml").send(twiml.toString());
});

// -----------------------------------------------------------------------------
// Twilio Voice: AI Demo
// -----------------------------------------------------------------------------

/**
 * Optional AI-style voice greeting.
 *
 * This is intentionally simple for the demo. The keyword-based
 * response can later be replaced with an actual AI service.
 */
app.post("/voice/ai-greeting", (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();

  const gather = twiml.gather({
    input: "speech",
    action: "/voice/ai-respond",
    method: "POST",
    speechTimeout: "auto",
  });

  gather.say(
    { voice: "alice" },
    `Thanks for calling ${BUSINESS_NAME}. This is our virtual assistant. How can I help? You can ask about scheduling, pricing, or hours.`
  );

  // If no speech is detected, return to the normal call flow.
  twiml.redirect("/voice/incoming");

  res.type("text/xml").send(twiml.toString());
});

/**
 * Respond to speech from the AI demo.
 */
app.post("/voice/ai-respond", (req, res) => {
  const speech = (req.body.SpeechResult || "").toLowerCase();

  const twiml = new twilio.twiml.VoiceResponse();

  const reply = draftAiVoiceReply(
    speech,
    BUSINESS_NAME
  );

  twiml.say(
    { voice: "alice" },
    reply
  );

  twiml.say(
    { voice: "alice" },
    "I'll also text you a link to book directly so you don't have to wait on hold."
  );

  res.type("text/xml").send(twiml.toString());
});

// -----------------------------------------------------------------------------
// Lead Management
// -----------------------------------------------------------------------------

/**
 * Create a new in-memory lead record.
 */
function createLead({ from, status }) {
  return {
    from,
    to: TWILIO_NUMBER,
    status,
    timestamp: new Date().toISOString(),
    textSent: false,
    textBody: buildMissedCallText(),
  };
}

/**
 * Build the SMS sent after a missed call.
 */
function buildMissedCallText() {
  return (
    `Hi! Sorry we missed your call at ${BUSINESS_NAME}. ` +
    `We're on it — reply here and tell us what you need, or schedule a time ` +
    `that works for you: ${BOOKING_LINK}`
  );
}

/**
 * Send the missed-call recovery SMS.
 *
 * If Twilio credentials are not configured, this runs in demo mode
 * and simply logs the message instead of sending it.
 */
async function sendRecoveryText(to, body, leadRecord) {
  if (!twilioClient) {
    console.log(
      `[demo mode] would SMS ${to}: "${body}"`
    );

    // Mark as sent so the dashboard demonstrates the complete flow.
    leadRecord.textSent = true;
    return;
  }

  try {
    await twilioClient.messages.create({
      to,
      from: TWILIO_NUMBER,
      body,
    });

    leadRecord.textSent = true;

    console.log(`[sms] recovery text sent to ${to}`);
  } catch (error) {
    console.error(
      `[sms] failed to send recovery text to ${to}:`,
      error.message
    );
  }
}


// -----------------------------------------------------------------------------
// AI Demo Logic
// -----------------------------------------------------------------------------

/**
 * Simple keyword-based AI placeholder.
 *
 * This function is intentionally isolated so it can later be replaced
 * by an actual AI service without changing the Twilio routes.
 */
function draftAiVoiceReply(speech, businessName) {
  if (
    speech.includes("price") ||
    speech.includes("cost") ||
    speech.includes("quote")
  ) {
    return (
      "Most of our jobs run between one hundred and four hundred dollars " +
      "depending on scope. I can text you exact pricing and a booking link right now."
    );
  }

  if (
    speech.includes("hour") ||
    speech.includes("open")
  ) {
    return (
      "We're open Monday through Saturday, eight A.M. to six P.M. " +
      "If it's urgent, I can flag this as an emergency call."
    );
  }

  if (
    speech.includes("appointment") ||
    speech.includes("schedul") ||
    speech.includes("book")
  ) {
    return (
      "I can get you booked in. I'm sending a link to your phone now " +
      "so you can pick whatever time works best."
    );
  }

  return (
    `Got it. Someone from ${businessName} will follow up shortly. ` +
    "I'm also texting you a link so you can book a time that works for you."
  );
}

// -----------------------------------------------------------------------------
// Dashboard API
// -----------------------------------------------------------------------------

/**
 * Return all recovered leads for the dashboard.
 */
app.get("/api/leads", (req, res) => {
  res.json({
    businessName: BUSINESS_NAME,
    leads,
  });
});

// -----------------------------------------------------------------------------
// Demo / Testing API
// -----------------------------------------------------------------------------

/**
 * Simulate a missed call without requiring a real Twilio call.
 *
 * Example:
 *
 * POST /api/simulate-missed-call
 * {
 *   "from": "+15551234567"
 * }
 */
app.post("/api/simulate-missed-call", async (req, res) => {
  const from =
    req.body.from ||
    `+1555${Math.floor(
      1000000 + Math.random() * 8999999
    )}`;

  const lead = createLead({
    from,
    status: "no-answer",
  });

  leads.unshift(lead);

  await sendRecoveryText(
    from,
    lead.textBody,
    lead
  );

  res.json({
    ok: true,
    lead,
  });
});

// -----------------------------------------------------------------------------
// Server
// -----------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(
    `Missed-call recovery demo running on http://localhost:${PORT}`
  );

  console.log(
    `Dashboard:            http://localhost:${PORT}/`
  );

  console.log(
    `Voice webhook:        POST http://localhost:${PORT}/voice/incoming`
  );

  console.log(
    `AI greeting webhook:  POST http://localhost:${PORT}/voice/ai-greeting`
  );

  console.log(
    `Simulate missed call: POST http://localhost:${PORT}/api/simulate-missed-call`
  );
});