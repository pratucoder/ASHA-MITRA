# ASHA Mitra (आशा मित्र)
### AI-Powered Voice Triage Assistant for ASHA Workers
---
the demo proptotype is live at https://asha-mitra.vercel.app/
---
## 🚨 The Problem

India’s rural healthcare system relies heavily on **ASHA (Accredited Social Health Activist) workers**—grassroots community health volunteers who serve as the critical first point of contact between remote villages and the formal health system. However, these workers face a dangerous infrastructure gap: **they have no structured, clinical decision-support tools to instantly assess how urgent a patient's condition is.** 

This leads to several systemic crisis dimensions:
* **The Triage Gap:** Without an objective framework, a child with life-threatening anemia and a child with a common temporary fever often receive the exact same verbal referral timeline, leading to preventable maternal and infant mortality
* **Language & Literacy Barriers:** ASHA workers are expected to make critical, life-saving health decisions but must navigate complex clinical protocols while operating in dozens of regional languages and dialects with zero English literacy requirements
* **Severe Connectivity Issues:** Most Tier 3/4 villages in India operate on spotty 2G networks or suffer from complete blackout zones, rendering standard cloud-based medical applications completely useless
* **Paper-Based Vulnerability:** Patient health histories are manually recorded in physical paper registers that are easily lost, damaged, or completely unverified when the patient finally arrives at a referral hospital. ASHA workers often face situations where their clinical assessments are questioned or altered, offering them zero legal protection

---

## 💡 Our Solution: How We Solve It

**ASHA Mitra** is an offline-first, voice-driven Progressive Web App (PWA) designed to act as an intelligent, humanistic digital companion for ASHA workers[cite: 1]. It turns any standard Android smartphone into a clinical decision-support ecosystem—operating entirely without an internet connection

Here is exactly how the system solves the crisis on the ground:

### 1. Voice-First Multilingual Intake (Zero Typing)
Instead of forcing low-literacy users to type complex medical terms, the worker simply opens the app and speaks conversationally in her native language (supporting Hindi, Marathi, Telugu, Tamil, and up to 12+ regional languages)

### 2. On-Device AI & Clinical Triage
The app utilizes optimized, on-device Speech-to-Text (STT) and local clinical knowledge bases to process the symptom description completely offline[cite: 1]. It instantly classifies the condition and assigns a strict, color-coded **Triage Urgency Level**
* 🔴 **RED (Critical / Immediate):** Generates an emergency referral and automated alert
* 🟡 **YELLOW (Moderate / Refer Soon):** Recommends formal hospital evaluation within 24–48 hours
* 🟢 **GREEN (Low Urgency / Monitor):** Recommends safe home care with localized follow-up instructions

### 3. One-Tap Digital Referrals
The app auto-generates a structured digital referral slip containing the timestamp, recorded symptoms, and clinical priority level[cite: 1]. The ASHA worker can share this slip directly with Auxiliary Nurse Midwives (ANMs) or Primary Health Centers (PHCs) via WhatsApp with a single tap

### 4. Tamper-Proof Blockchain Verification
To completely eliminate paper loss and protect the institutional trust of grassroots workers, ASHA Mitra generates a cryptographic hash (SHA-256) of every single triage record[cite: 1]. As soon as the device detects a cellular network or baseline internet connection, this hash is permanently anchored onto the **Polygon Blockchain**
* **Privacy First:** Only the anonymous hash and timestamp are uploaded, keeping sensitive patient data safe
* **Immutable Proof:** This gives the ASHA worker undeniable, legally verifiable proof that she made the right assessment at the exact recorded time, protecting her from shifting liability

---
*Developed for **BuildForGood 2026** | Theme: **SWASTHYA (स्वास्थ्य)** — Rural & Remote Healthcare Access.
