<div align="center">

# MobileWright POC

### A production-grade Page Object Model framework for native mobile test automation

**TypeScript · MobileWright · Page Object Model · Real Devices · AI-Powered Triage**

[![Android Tests](https://github.com/pkchat55/MobileWright_POC/actions/workflows/android-tests.yml/badge.svg)](https://github.com/pkchat55/MobileWright_POC/actions/workflows/android-tests.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%3E%3D22.12-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/Platform-Android-3DDC84?logo=android&logoColor=white)](#)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/pkchat55/MobileWright_POC/pulls)

[Quick Start](#-quick-start) · [Architecture](#-architecture) · [Run Anywhere](#-run-anywhere) · [AI Failure Dashboard](#-ai-powered-failure-dashboard) · [CI/CD](#-cicd-pipeline)

</div>

---

## Why this exists

Most mobile test frameworks force a choice: **fast local iteration** *or* **real-device coverage**, **clean architecture** *or* **CI-ready automation**. This project proves you don't have to choose.

`MobileWright_POC` automates a real Android app (**MediShop**) end-to-end using a strict **Page Object Model**, then runs the exact same test suite — unchanged — against:

- 📱 A local Android emulator
- ☁️ Real devices on **Mobile Next Cloud**
- ☁️ Real devices on **BrowserStack App Automate**
- 🤖 GitHub Actions, with an **AI-generated failure dashboard** on every run

One config. One Page Object layer. Every environment.

---

## ✨ Features

| | |
|---|---|
| 🏗️ **Strict layering** | `config → fixtures → pages → tests`. Specs never touch the device or screen directly. |
| 🔁 **Playwright-style ergonomics** | `test.extend`, fixtures, `getByTestId`/`getByText`, `beforeEach`/`afterEach` — familiar to any Playwright engineer. |
| 📦 **Dependency injection** | Page objects are constructed once, per test, via typed fixtures — no globals, no singletons. |
| 🌍 **Multi-target execution** | Local emulator, real device, Mobile Next Cloud, or BrowserStack App Automate — selected purely by environment variable. |
| 🧠 **AI-powered failure triage** | Every CI run classifies failures by **Priority** and **Severity**, generates a root-cause analysis via OpenAI, and attaches an emulator screenshot as evidence. |
| 🚦 **CI-native** | GitHub Actions workflow spins up a real Android emulator, runs the suite, and publishes an HTML dashboard as a build artifact. |
| 🧹 **Reviewed automatically** | CodeRabbit installed on every pull request for automated code review. |

---

## 🏛️ Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  mobilewright.config.ts                                         │
│  platform · device · bundleId · driver (local / cloud) · timeout│
└───────────────────────────────┬──────────────────────────────────┘
                                │ provides { device, screen }
                                ▼
┌────────────────────────────────────────────────────────────────┐
│  fixtures/test.ts                                                │
│  Injects loginPage / homePage / cartPage as typed fixtures       │
└───────────────────────────────┬──────────────────────────────────┘
                                │ constructs page objects
                                ▼
┌────────────────────────────────────────────────────────────────┐
│  pages/*.ts   — Page Object Model                                │
│  private locators (getters)  +  public actions (async methods)   │
└───────────────────────────────┬──────────────────────────────────┘
                                │ used by
                                ▼
┌────────────────────────────────────────────────────────────────┐
│  tests/*.test.ts — business-readable scenarios                   │
│  zero locators, zero sleeps, zero platform quirks                │
└────────────────────────────────────────────────────────────────┘
```

**Golden rules:**
1. Tests never import `screen`/`device` directly — only fixtures.
2. Locators are `private get`ters; actions are `public async` methods named for user intent.
3. All test data lives in `testData/*.json`, never inline in specs.
4. Platform quirks (text-clearing, swipe-to-find, keyboard dismissal) are encapsulated inside page objects.

Full write-up: [`PageObjectModelMW/ARCHITECTURE.md`](PageObjectModelMW/ARCHITECTURE.md) · Rebuild blueprint: [`PageObjectModelMW/SKILLS.md`](PageObjectModelMW/SKILLS.md)

---

## 📂 Project structure

```
MobileWright_POC/
├── .github/workflows/android-tests.yml   # CI: emulator + AI dashboard
├── LICENSE
└── PageObjectModelMW/
    ├── mobilewright.config.ts            # Local / Mobile Next / BrowserStack switch
    ├── pages/                             # Page Object Model
    │   ├── LoginPage.ts
    │   ├── HomePage.ts
    │   └── CartPage.ts
    ├── fixtures/test.ts                   # Fixture-based dependency injection
    ├── testData/loginData.json            # Externalized test data
    ├── tests/login.test.ts                # Maintained production specs
    ├── scripts/generate-ai-dashboard.mjs  # AI failure-triage dashboard generator
    ├── app/way2automation.apk             # App under test
    ├── MOBILE_NEXT_CLOUD.md               # Real-device cloud setup
    └── OPENAI_SETUP.md                    # AI analysis setup
```

---

## 🚀 Quick Start

```bash
cd PageObjectModelMW
npm install

# Point mobilewright.config.ts at a running Android emulator or device,
# then run the suite:
npm test
```

Requires **Node ≥ 22.12** and an Android emulator/device visible to `adb devices`.

---

## 🌍 Run Anywhere

The same [`tests/login.test.ts`](PageObjectModelMW/tests/login.test.ts) suite runs unmodified across every target below — only the driver changes.

| Target | Command | Notes |
|---|---|---|
| **Local emulator / device** | `npm run test:android` | Default. Uses `mobilecli` + `adb`. |
| **Mobile Next Cloud** (real device) | `npm run test:cloud` | Requires `MOBILE_NEXT_API_KEY`. See [`MOBILE_NEXT_CLOUD.md`](PageObjectModelMW/MOBILE_NEXT_CLOUD.md). |
| **BrowserStack App Automate** (real device) | `npm run test:browserstack` | Requires `BROWSERSTACK_USERNAME` / `BROWSERSTACK_ACCESS_KEY`. |

```bash
# Real Android device in the cloud, zero code changes:
MOBILEWRIGHT_CLOUD=1 npm run test:cloud

# Real device on BrowserStack App Automate:
MOBILEWRIGHT_BROWSERSTACK=1 npm run test:browserstack
```

---

## 🧠 AI-Powered Failure Dashboard

Every CI run produces a professional, self-contained HTML dashboard — no dashboard hosting required.

- **Priority** (`P0`–`P3`) and **Severity** (`Critical`–`Low`) auto-classified from failure signatures.
- **Root-cause analysis** generated by OpenAI (`gpt-4.1-mini`), with a deterministic rule-based fallback when no key is configured.
- **Emulator screenshot** attached as visual evidence of the final app state.
- Published to the GitHub Actions **Job Summary** and as a downloadable `android-test-ai-dashboard` artifact.

Set it up in two minutes: [`OPENAI_SETUP.md`](PageObjectModelMW/OPENAI_SETUP.md)

---

## 🔁 CI/CD Pipeline

[`.github/workflows/android-tests.yml`](.github/workflows/android-tests.yml) runs on every push and pull request:

1. Boots a real Android emulator (API 35) inside the GitHub Actions runner.
2. Installs the MediShop APK and runs the maintained test suite.
3. Captures a final emulator screenshot for evidence.
4. Generates the AI failure-triage dashboard and publishes it to the job summary.
5. Uploads the HTML report and dashboard as build artifacts — pass or fail.

Pull requests are additionally reviewed automatically by **CodeRabbit**.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Test runner | [`mobilewright`](https://www.npmjs.com/package/mobilewright) / `@mobilewright/test` |
| Language | TypeScript 5.x |
| Pattern | Page Object Model + fixture-based dependency injection |
| Local driver | `mobilecli` (Android emulator / real device via `adb`) |
| Cloud drivers | `@mobilewright/driver-mobilenext` (Mobile Next Cloud) · `@browserstack/mobilewright` (App Automate) |
| CI | GitHub Actions + `reactivecircus/android-emulator-runner` |
| AI analysis | OpenAI `gpt-4.1-mini` |
| Code review | CodeRabbit |

---

## 🤝 Contributing

[Issues](https://github.com/pkchat55/MobileWright_POC/issues) and [pull requests](https://github.com/pkchat55/MobileWright_POC/pulls) are welcome. CodeRabbit will automatically review every PR opened against `main`.

## ⭐ Support this project

If this architecture saved you time, **star the repo** — it helps others discover a clean, production-ready pattern for mobile test automation.

## License

[MIT](LICENSE) © Pravin Chaturvedi
