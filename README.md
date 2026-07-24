# ASHA Mitra (आशा मित्र) - AI-Powered Voice Triage Assistant for ASHA Workers

## Overview

ASHA Mitra is an AI-powered, offline-first Progressive Web Application (PWA) built to empower ASHA (Accredited Social Health Activist) workers in rural India with instant clinical decision support. It acts as an intelligent digital companion that enables healthcare workers to assess patient conditions using voice, classify medical urgency, generate digital referrals, and securely verify records using blockchain technology.

The platform addresses challenges such as poor connectivity, language barriers, paper-based record management, and lack of structured triage systems in rural healthcare.

---

## Live Demo

🔗 https://asha-mitra.onrender.com/

---

# Problem Statement

India's rural healthcare system depends heavily on ASHA workers who often serve as the first point of medical contact. However, they face several critical challenges:

- No standardized clinical decision-support system
- Manual paper-based patient records
- Poor internet connectivity in remote villages
- Multiple regional languages and literacy barriers
- Lack of legal proof of patient assessment
- Delayed identification of emergency cases

These limitations often result in delayed referrals, inconsistent assessments, and preventable maternal and infant mortality.

---

# Solution

ASHA Mitra provides an AI-assisted healthcare ecosystem that works even in offline environments.

The application enables ASHA workers to:

- Record patient symptoms using voice
- Perform AI-powered clinical triage
- Generate digital referral slips
- Securely store patient records
- Verify assessments using blockchain
- Continue working without internet connectivity

---

# Features

## Voice-Based Patient Intake

- Voice-first interface
- No typing required
- Native language support
- Speech-to-Text processing
- Simple conversational interaction

Supported Languages

- Hindi
- Marathi
- Tamil
- Telugu
- English
- Additional regional languages (planned)

---

## AI Clinical Triage

The application analyzes symptoms and classifies patient urgency into three categories.

### 🔴 RED

- Critical Condition
- Immediate Referral Required
- Emergency Alert

### 🟡 YELLOW

- Moderate Risk
- Hospital Visit within 24–48 Hours

### 🟢 GREEN

- Low Risk
- Home Care Instructions
- Scheduled Follow-up

---

## Digital Referral System

- Auto-generated referral slips
- Timestamped reports
- Structured symptom summary
- Triage priority included
- One-tap WhatsApp sharing
- Hospital-ready referral document

---

## Offline-First Architecture

- Works without internet
- Local data storage
- Offline AI inference
- Synchronizes automatically once internet is available
- Progressive Web App (PWA)

---

## Blockchain Verification

Every patient triage record is cryptographically verified.

Features include:

- SHA-256 hashing
- Polygon Blockchain integration
- Immutable timestamp verification
- Tamper-proof audit trail
- Privacy-preserving architecture
- No patient data stored on-chain

---

## Patient Record Management

- Digital patient history
- Local encrypted storage
- Referral history
- Previous consultations
- Follow-up tracking

---

## Healthcare Dashboard

- Daily patient count
- Emergency case tracking
- Referral statistics
- Pending follow-ups
- Recent patient activity

---

# User Roles

## ASHA Worker

- Record patient symptoms
- Perform voice-based triage
- Generate referrals
- Access patient history
- Track follow-ups

---

## ANM / PHC Staff

- View digital referrals
- Verify patient assessments
- Access referral history
- Continue treatment workflow

---

## Administrator

- Manage healthcare workers
- Monitor analytics
- Configure language support
- Manage healthcare facilities

---

# Tech Stack

## Frontend

- React.js
- Tailwind CSS
- Vite
- Progressive Web App (PWA)

---

## Backend

- Node.js
- Express.js
- REST API

---

## AI & Machine Learning

- Speech-to-Text (STT)
- AI-based Clinical Triage Engine
- Local Inference Models
- Multilingual NLP

---

## Database

- PostgreSQL
---

## Blockchain

- Polygon
- SHA-256 Hashing
- Immutable Verification

---

## Tools

- Prisma ORM
- Postman
- Git
- GitHub
- VS Code

---

# Project Architecture

```text
ASHA Worker

      │

 Voice Input

      │

Speech-to-Text Engine

      │

AI Clinical Triage Engine

      │

Generate Referral

      │

Store Patient Record

      │

SHA-256 Hash Generation

      │

Polygon Blockchain

      │

Healthcare Dashboard
```

---

# Core Modules

- Authentication
- Voice Processing
- AI Triage Engine
- Patient Management
- Referral Generation
- Blockchain Verification
- Offline Synchronization
- Healthcare Dashboard
- Notification System

---

# Folder Structure

```text
ASHA-Mitra/

├── client/
│   ├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── services/
│   └── utils/
│
├── server/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── prisma/
│   ├── blockchain/
│   ├── ai/
│   ├── config/
│   └── server.js
│
├── README.md
└── package.json
```

---

# Core Workflows

## Voice-Based Triage

```text
Open App
     ↓
Speak Symptoms
     ↓
Speech-to-Text
     ↓
AI Analysis
     ↓
Assign Triage Level
     ↓
Display Recommendation
```

---

## Referral Workflow

```text
Patient Assessment
        ↓
AI Classification
        ↓
Generate Referral Slip
        ↓
Share via WhatsApp
        ↓
Hospital Receives Referral
```

---

## Blockchain Verification

```text
Patient Record
      ↓
Generate SHA-256 Hash
      ↓
Store Record Locally
      ↓
Internet Available
      ↓
Upload Hash to Polygon
      ↓
Immutable Verification
```

---

# Security Features

- JWT Authentication
- Secure Password Hashing
- End-to-End Encryption
- SHA-256 Record Hashing
- Blockchain Verification
- Privacy-First Architecture
- Offline Secure Storage
- Role-Based Access Control

---

# Future Enhancements

- OCR for Medical Documents
- AI-powered Disease Prediction
- Wearable Device Integration
- Telemedicine Support
- Electronic Health Records (EHR)
- SMS Alerts
- GPS-enabled Emergency Routing
- Regional Language Expansion
- Maternal Health Monitoring
- Child Vaccination Tracking

---

# Installation

## Clone Repository

```bash
git clone https://github.com/your-username/asha-mitra.git

cd asha-mitra
```

## Install Backend

```bash
cd server

npm install
```

## Install Frontend

```bash
cd client

npm install
```

## Configure Environment Variables

```env
DATABASE_URL=

JWT_SECRET=

POLYGON_RPC_URL=

PRIVATE_KEY=

PORT=5000
```

## Start Backend

```bash
npm run dev
```

## Start Frontend

```bash
npm run dev
```

---

# API Modules

- Authentication
- Voice Processing
- Patient Management
- AI Triage
- Referral Management
- Blockchain Verification
- Notifications
- Dashboard
- Healthcare Analytics

---

# Team Responsibilities

| Member | Responsibility |
|----------|----------------|
| Frontend Developer | React UI, Voice Interface, PWA, API Integration |
| Backend Developer | REST APIs, Authentication, Database, AI Integration, Blockchain |
| AI Developer | Speech-to-Text, NLP, Clinical Triage |
| Blockchain Developer | Polygon Integration, Hash Verification |

---

# Future Scope

- Nationwide ASHA Deployment
- Government Health Scheme Integration
- Hospital Information System Integration
- AI-assisted Diagnosis
- Offline LLM Support
- Digital Health ID Integration (ABHA)
- Predictive Healthcare Analytics
- Emergency Ambulance Dispatch
- Cloud Synchronization
- Multi-State Language Expansion

---

# Deployment on Vercel

Since the repository contains separate frontend and backend applications, you will deploy them as two separate projects on Vercel.

## 1. Backend Deployment

1. Go to your **Vercel Dashboard** and click **Add New** -> **Project**.
2. Connect your GitHub repository.
3. In the project settings, set the **Root Directory** to `backend`.
4. Vercel will automatically detect `backend/vercel.json` and deploy the Express API.
5. Configure the following **Environment Variables** in the project settings:
   - `MONGODB_URI`: Your persistent MongoDB Atlas URI.
   - `SARVAM_API_KEY`: Your Sarvam Speech API Key.
   - `OPENROUTER_API_KEY`: Your OpenRouter API Key.
   - `JWT_SECRET`: A secure random key for JWT signing.
6. Click **Deploy** and copy your deployed backend URL (e.g. `https://asha-mitra-backend.vercel.app`).

## 2. Frontend Deployment

1. Go to your **Vercel Dashboard** and click **Add New** -> **Project**.
2. Connect the same GitHub repository.
3. In the project settings:
   - Set the **Root Directory** to `frontend`.
   - Set the **Framework Preset** to `Vite`.
4. Configure the following **Environment Variable** in the project settings:
   - `VITE_API_URL`: Set this to your deployed backend URL from step 1 (including `https://`).
5. Click **Deploy**. Vercel will read `frontend/vercel.json` to handle client-side routing properly.

---

# License

This project was developed for **BuildForGood 2026** under the **SWASTHYA (स्वास्थ्य) — Rural & Remote Healthcare Access** theme.

Made with ❤️ to empower India's frontline healthcare workers.
