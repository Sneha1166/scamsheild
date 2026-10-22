# 🛡️ ScamShield — Online Scam Detection & Web Security Platform

> **⚠️ DEMO MODE** — All scan results are rule-based demonstrations and do **not** guarantee real-world safety. This is an educational project only.

---

## 📌 Overview

**ScamShield** is a lightweight, self-hosted cybersecurity education platform built with:

- **Backend**: C programming language + Windows Sockets 2 (Winsock2) — a minimal HTTP/1.1 server with REST API endpoints
- **Frontend**: HTML5, CSS3, and vanilla JavaScript — no frameworks, no npm, no dependencies

The platform provides six interactive security tools, a live-updating dashboard, animated charts, and a searchable table of 50 fictional cybersecurity scan records — all running from a single compiled binary on `localhost:8080`.

---

## 🗂️ Project Structure

```
scamshield/
├── server.c                      ← C backend HTTP server + detection engine
├── server.exe                    ← Pre-compiled Windows binary
├── index.html                    ← Dashboard single-page application
├── style.css                     ← Dark navy glassmorphism theme
├── app.js                        ← Frontend logic, charts, demo data
├── README.md                     ← This file
└── ScamShield_Project_Report.docx← Full project report (convert to PDF)
```

---

## ✨ Features

| # | Module | Description |
|---|--------|-------------|
| 1 | 🔗 **Phishing URL Checker** | Detects suspicious links via keyword, TLD, and IP heuristics |
| 2 | 🌐 **Website Security Scanner** | Simulates HTTPS, CSP, HSTS, CORS, and X-Frame-Options checks |
| 3 | 📩 **Scam Message Detector** | Identifies scam SMS/email patterns (lottery, OTP phishing, etc.) |
| 4 | 💼 **Fake Job Detector** | Flags fraudulent job offers via red-flag keyword matching |
| 5 | 💳 **UPI Scam Awareness** | Six illustrated cards covering common UPI payment frauds |
| 6 | 🛡️ **Cybersecurity Safety Score** | 8-question self-assessment quiz with personalised recommendations |

### Dashboard Extras
- **4 stat cards** — Total Scans, Safe URLs, Suspicious URLs, Scams Detected (animated counters)
- **7-day bar chart** — Scan activity visualised on HTML Canvas
- **50 demo records** — Searchable, sortable, paginated table with CSV export
- **Generate Sample Data** button — populates the dashboard instantly

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Details |
|-------------|---------|
| OS | Windows 10 or later |
| Compiler | GCC via [MSYS2](https://www.msys2.org) or [TDM-GCC](https://jmeubank.github.io/tdm-gcc/) |
| Browser | Any modern browser (Chrome, Firefox, Edge) |

### Step 1 — Install GCC (MSYS2)

```bash
# In the MSYS2 MinGW64 terminal:
pacman -S mingw-w64-x86_64-gcc
```

### Step 2 — Compile

```bash
cd scamshield
gcc server.c -o server.exe -lws2_32 -O2
```

| Flag | Purpose |
|------|---------|
| `-lws2_32` | Links the Windows Sockets 2 library (required) |
| `-O2` | Enables compiler optimisations |
| `-Wall -Wextra` | Optional: enable all warnings for development |

### Step 3 — Run

```bash
./server.exe
```

Expected output:
```
ScamShield Server running on http://localhost:8080
Press Ctrl+C to stop.
```

### Step 4 — Open in Browser

```
http://localhost:8080
```

> **Important**: Run `server.exe` from the same directory as `index.html`, `style.css`, and `app.js`. All four files must be in the same folder.

---

## 🔌 API Reference

The C server exposes three POST endpoints:

### `POST /api/check-url`

**Request body:**
```json
{ "url": "http://win-free-iphone.tk" }
```

**Response:**
```json
{
  "url": "http://win-free-iphone.tk",
  "verdict": "DANGEROUS",
  "score": 95,
  "reason": "High risk: No HTTPS. Suspicious TLD. free-iphone; winner; ",
  "demo": true
}
```

---

### `POST /api/check-message`

**Request body:**
```json
{ "message": "Congratulations! You WON ₹50,000. Click link to claim." }
```

**Response:**
```json
{
  "message": "Congratulations! You WON ₹50,000. Click link to claim.",
  "verdict": "SCAM",
  "score": 80,
  "reason": "High scam probability: won a prize; claim your reward; ",
  "demo": true
}
```

---

### `POST /api/check-job`

**Request body:**
```json
{ "text": "Work from home, earn $5000 daily, no experience needed!" }
```

**Response:**
```json
{
  "text": "Work from home, earn $5000 daily, no experience needed!",
  "verdict": "FAKE JOB",
  "score": 90,
  "reason": "Likely fraudulent offer: work from home; earn $5000; no experience needed; ",
  "demo": true
}
```

---

### Verdict Levels

| Module | Score Range | Verdict |
|--------|-------------|---------|
| URL Checker | 0 – 29 | ✅ SAFE |
| URL Checker | 30 – 59 | ⚠️ SUSPICIOUS |
| URL Checker | 60 – 100 | 🚨 DANGEROUS |
| Message Detector | 0 – 24 | ✅ CLEAN |
| Message Detector | 25 – 59 | ⚠️ SUSPICIOUS |
| Message Detector | 60 – 100 | 🚨 SCAM |
| Job Detector | 0 – 24 | ✅ LEGITIMATE |
| Job Detector | 25 – 49 | ⚠️ SUSPICIOUS |
| Job Detector | 50 – 100 | 🚨 FAKE JOB |

---

## 🧠 Detection Logic

All detection is **rule-based (heuristic)**. No machine learning, no external APIs, no training data.

### URL Phishing Rules

| Rule | Penalty |
|------|---------|
| HTTP (no HTTPS) | +10 |
| Phishing keywords (login, verify, winner, prize…) | +15 each |
| Suspicious TLD (.tk, .ml, .xyz, .pw, .click…) | +20 |
| IP address used as domain | +25 |
| Excessive subdomains (> 2 dots) | +15 |
| Trusted domain match (Google, IBM, GitHub…) | → SAFE immediately |

### Scam Message Rules

| Rule | Penalty |
|------|---------|
| Scam phrase match (20 patterns) | +20 each |
| Excessive uppercase (> 10 caps) | +15 |

### Fake Job Rules

| Rule | Penalty |
|------|---------|
| Fake-job keyword match (16 patterns) | +18 each |

> All scores are capped at **100**.

---

## 🎨 Design System

| Property | Value |
|----------|-------|
| Theme | Dark navy glassmorphism |
| Background | `#050d1a` (navy-900) |
| Primary accent | `#00e5ff` (cyan) |
| Secondary accent | `#a855f7` (purple) |
| Success | `#22c55e` (green) |
| Warning | `#f59e0b` (yellow) |
| Danger | `#ef4444` (red) |
| Glass card | `rgba(255,255,255,0.04)` bg + `rgba(0,229,255,0.12)` border |
| Font | Segoe UI / system-ui |

---

## 🔐 Security & Ethical Notes

1. **No external data transmission** — everything runs on `localhost`. No user data leaves the machine.
2. **No false guarantees** — every result includes a visible disclaimer.
3. **Authorised scanning only** — only scan websites you own or have explicit permission to test.
4. **No persistence** — the C server never writes user input to disk.
5. **Fictional demo data** — the 50 demo records are entirely invented.

---

## ⚙️ Troubleshooting

| Problem | Solution |
|---------|----------|
| `server.exe` won't start | Make sure GCC linked `-lws2_32` |
| Port 8080 already in use | Change `#define PORT 8080` in `server.c` to another port (e.g. `9090`) and recompile |
| Browser shows blank page | Ensure `server.exe` is running from the same folder as `index.html` |
| API returns connection refused | Server is not running — start `./server.exe` first |
| Charts not rendering | Try a different browser; Canvas API requires a modern browser |
| Offline fallback message | Normal behaviour when `index.html` is opened directly without the server |

---

## 📦 Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend | C (C11), Winsock2 |
| Frontend | HTML5, CSS3, JavaScript ES6+ |
| Charts | HTML Canvas API (vanilla) |
| Compiler | GCC (MinGW-w64 / MSYS2) |
| Protocol | HTTP/1.1 (hand-rolled in C) |
| Data Format | JSON (hand-serialised in C) |
| No frameworks | ✅ Zero npm / pip / Maven dependencies |

---

## 🔭 Roadmap

- [ ] Multi-threaded C server (`CreateThread`)
- [ ] Live threat intelligence (Google Safe Browsing API, PhishTank)
- [ ] Real HTTP header fetching for the Web Scanner
- [ ] SQLite3 persistence for scan history
- [ ] POSIX socket port for Linux/macOS compatibility
- [ ] Naive Bayes classifier for higher-accuracy URL detection
- [ ] Browser extension version

---

## 📜 License

This project is released for **educational and academic purposes only**. No part of this codebase should be used for actual security enforcement without a professional audit and significant hardening.

---

## 🤝 Acknowledgements

- [OWASP Foundation](https://owasp.org) — Web security best-practice guidance  
- [FBI IC3](https://www.ic3.gov) — Cybercrime statistics and awareness  
- [NPCI](https://www.npci.org.in) — UPI fraud awareness resources  
- [IBM Bob](https://www.ibm.com/products/watsonx-code-assistant) — AI coding assistant used to build this project  

---

> 🛡️ **ScamShield** — Built with C + HTML/CSS/JS &nbsp;|&nbsp; Compatible with IBM Bob  
> *All results are rule-based demonstrations only. Not a substitute for professional cybersecurity tools.*
