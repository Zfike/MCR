# Missed-Call Recovery Demo (Twilio)

A working demo of a missed-call recovery system for local service businesses such as HVAC, plumbing, and dental practices.

When a call to a business goes unanswered, the system can send the caller an automated text instead of letting the lead disappear into voicemail. The demo also includes an optional AI voice-answering path (currently not implemented).

The project can run in **demo mode without a Twilio account**. In demo mode, SMS messages are logged to the console and displayed on the live dashboard instead of actually being sent.

As a simple demo, this application only needs ngrok installed separately in order to have the localhost web server exposed to the internet so that it can interact with Twilio (Still needs extra work).

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

# Basic Install and Run

Clone this repo into your chosen directory. CD into [root]/backend
```bash
npm start
```
This will start the app in demo mode, which means it will use sample .env values without Twilio account information. 

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
        |      └── AI agent processes caller information
        |      └── SMS notification to "on-duty" phone (if applicable)
        |      └── logs the lead
        │                |
        |                ▼
        |          Live dashboard
        |
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

---

## Project Technical Theory

Missed Call Recovery (temp name) will be a web based application that will be managed by LLC (name?) and configured for a client. 

The system shall include:
 - a core of services to run the application
 - a web server to serve those services (API based communication)
 - Telephony service to handle the calls themselves and provides an API to interact with the application
 - AI integration in order to better tailor SMS responses to customers of our clients and answer calls. Another aspect of AI integration is increasing the reaction time to an incoming call. This way a call can be answered within 1-2 rings.
 - Web GUI for clients to interact with the system.
 - The web GUI will display logs of calls and notifications for recent and missed calls

Testing was done with Twilio, however any telephony service that offers a business number to use for managing customer calls and has an API that the application can use will work. 

A business can have one to many phone numbers. At least one "main" business number will be attached to the system. If a business has more than one phone, the system will need to be able to answer a call, process a caller's info, store the call log, and route notifications and/or calls to "on-duty" phone numbers.

Ideally a scalable database would be attached to the system (Postgres, PG Edge, SQLite, etc.). A database would be added per customer and managed from the LLC (Name?). A client's database would contain call logs and metadata for the business. 

The database would go along with a per client instance of the application with a client facing dashboard that they can access to see call data and a call log. A client could also make changes for their application [changes tbd] through the dashboard. 



