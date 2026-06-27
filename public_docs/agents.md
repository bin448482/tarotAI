# TarotAI Public Agent Guide

This document gives public, English-only guidance for AI coding agents working with the shareable TarotAI repository.

## Product Context

TarotAI is a cross-platform tarot reading product. It includes:

- an Expo React Native mobile app for the end-user reading experience;
- a FastAPI backend for identity, tarot content, readings, credits, and admin APIs;
- a Next.js admin console for operations;
- a Python content-generation tool for tarot interpretation material.

The product should be understood as a consumer mobile experience first, not only as a technical demo. Code changes should protect the guided reading journey, the card-learning experience, and the credit-based AI-reading flow.

## Public Documentation Language

All public-share documentation must be written in English. This includes `README.md` and every document under `public_docs/`. Do not add Chinese public-share docs unless the project owner explicitly asks for a separate localized document.

## Product Principles

1. **Keep the reading flow simple.** Users should always know what to do next: choose, describe, draw, read.
2. **Give value before payment.** Basic card meaning should remain useful even when AI interpretation is not used.
3. **Avoid registration friction.** Anonymous identity is part of the product strategy.
4. **Respect trust boundaries.** Payments, credits, user identity, and AI output require conservative validation and clear error states.
5. **Use public-safe examples only.** Do not add real credentials, production data, private deployment details, or personal information.

## Repository Areas

```text
my-tarot-app/        Mobile app and customer-facing experience
tarot-backend/       Backend API, identity, readings, credits, and admin support
tarot-admin-web/     Web admin console for operations
tarot-ai-generator/  Internal content generation helper
deploy/              nginx and deployment assets
pics/                README screenshots
public_docs/         Public English documentation
```

## Expected Agent Behavior

- Prefer small, direct changes over broad rewrites.
- Match the style of the surrounding code.
- Keep TypeScript and Python types clear at API boundaries.
- Do not add new dependencies unless an existing platform feature or installed dependency is clearly insufficient.
- Update README or public docs when behavior changes affect product understanding.
- Keep public-share documentation English-only.
- For non-trivial logic, leave the smallest useful runnable check.

## Public Sharing Rules

Before preparing a public release, verify that the shared branch does not include:

- `.env` files or real API keys;
- production databases or private user data;
- Google service-account private keys;
- Android/iOS keystores, certificates, or signing secrets;
- private deployment paths, logs, cookies, or local machine configuration;
- real admin passwords, JWT secrets, webhook secrets, or payment secrets.

Example placeholders are acceptable. Real operational secrets are not.

## Product Status

Implemented product areas include anonymous access, tarot cards and spreads, guided readings, AI interpretation, reading history, credits, redemption codes, admin user management, orders, dashboards, and monitoring.

Planned or in-progress areas include Google Play purchase polish, offline sync, production deployment hardening, and deeper product metrics.
