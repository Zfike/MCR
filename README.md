# Missed-Call Recovery Demo (Twilio)

A working demo of a missed-call recovery system for local service businesses such as HVAC, plumbing, and dental practices.

When a call to a business goes unanswered, the system can send the caller an automated text instead of letting the lead disappear into voicemail. The demo also includes an optional AI voice-answering path.

The project can run in **demo mode without a Twilio account**. In demo mode, SMS messages are logged to the console and displayed on the live dashboard instead of actually being sent.

---

## Project Structure

```text
project-root/
├── backend/
│   ├── node_modules/
│   ├── .env
│   ├── package-lock.json
│   ├── package.json
│   └── server.js
│
├── public/
│   └── index.html
│
├── .gitignore
├── .env.example
└── README.md
```
---

## Typical Workflow

```text
Customer calls Twilio number
        │
        ▼
/voice/incoming
        │
        │ dials business phone
        ▼
Business phone rings
        │
        ├── answered
        │      └── call continues normally
        │
        └── unanswered / busy / failed
                │
                ▼
        /voice/dial-result
                │
                ├── sends recovery SMS
                ├── tells caller they were texted
                └── logs the lead
                        │
                        ▼
                 Live dashboard
```

# Basic Install and Run
---
Clone this repo into your chosen directory. CD into [root]/backend
```bash
npm start
```
