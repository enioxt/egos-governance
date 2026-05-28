# ⚡ Vibe Coding & Agentic Standards (2026)

> **Philosophy:** "Tests optimizing for 'doesn't crash' not 'does what user wants' are useless. The AI takes you 90% of the way; the last 10% is where the magic (and the pain) happens."

## 1. 🏗️ The 2026 Stack (Modern & Robust)
Standardize all new development on this stack to ensure speed, aesthetics, and agent-readiness.

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Auth** | **Social Login Only** (Supabase/Auth0) | Frictionless entry. No passwords to manage. |
| **Frontend** | **Next.js 15 + Tailwind** | The standard. Speed + Ecosystem. |
| **UI Components** | **Kokonut UI + Confetti** | "More Sauce". Rich animations, premium feel. |
| **Icons** | **Radix UI + RocketIcons** | Avoid generic Lucide. Use distinct visual language. |
| **Design** | **Mobile First (Absolute)** | If it doesn't work on iPhone, it doesn't work. |
| **Backend** | **Supabase (BaaS)** | Speed. Database, Auth, Realtime in one. |
| **State** | **URL State / Server State** | minimize client-side global state complexity. |

## 2. 🤖 Agentic Architecture (The "Relay" Model)
Move from **UI-First** to **API-First**. The app is just one client; Agents are the primary power users.

- **API-Centricity:** Every feature must be an API first. The UI just calls the API.
- **Agent Relay:**
    - Use `@egos/ai` as the orchestrator.
    - Agents should be able to "spawn" other agents (Swarm Intelligence).
    - **Diagnostics:** Agents should proactively read logs and self-diagnose failures.
- **Protocol:** Adopt MCP (Model Context Protocol) concepts for internal agent communication where possible.

## 3. 🛡️ Quality Assurance (The "Last Mile")
AI generates code that *looks* right. We must verify it *works* right.

### The Problem
> "Tests optimizing for 'doesn't crash' not 'does what user wants'."
> "AI self-assessment is 'expensive fanfiction'."

### The Solution: "Outer Feedback Loop"
1.  **Pyramid of Tests:**
    -   **E2E (Critical):** focus here. Playwright/Cypress.
    -   **Integration:** Test the API surface.
    -   **Unit:** Keep it light, focus on complex logic only.
2.  **Real Browser Testing:**
    -   Don't rely on JSDOM. Use **Playwright** with real WebKit/Chromium.
    -   Simulate clicks, navigation, and visual regression.
3.  **Environment Parity:**
    -   **Docker:** Local dev environment must mirror production. Use `docker-compose` for DB, Redis, etc.
4.  **Exploratory Testing:**
    -   **Human Loop:** 10-15 mins of manual "bashing" after green tests.
    -   **AI Loop:** Agents (using Playwright) trying to "break" the app.

## 4. 🚀 Implementation Guidelines

### Niches & Discovery
-   **Strategy:** `site:lovable.dev "nicho"` to find gaps.
-   **Prototyping:** Use Replit Design / Lovable for instant throwaway prototypes before committing to code.

### "Vibe" Requirement
-   **Aesthetics:** High-end, premium feel. "Botões falam por si só". Minimal text.
-   **Interactivity:** Micro-animations (Framer Motion) on every interaction.

---

**Rule of Thumb:** If an AI can't build it *and* an Agent can't test it, it's too complex. Simplify.
