# TarotAI Product Design Details

This document explains TarotAI from a product-management perspective: why the main features exist, how the current implementation supports them, and what user or business value each design choice creates.

## Product Positioning

TarotAI is designed as a consumer tarot companion, not only a card database and not only an AI chat product.

The product combines three layers:

1. **A guided ritual experience** — the user chooses a reading type, describes or selects a topic, draws cards, and receives a result.
2. **A reusable learning tool** — the user can browse the full tarot card library and learn upright/reversed meanings.
3. **A monetizable AI service** — the user can spend credits for personalized, question-aware interpretation.

This split matters because tarot usage is not always the same. Some users want a quick reflective reading. Some want to learn card meanings. Some want a deeper interpretation tied to a real personal question. TarotAI supports all three without forcing every user into the most expensive or network-dependent path.

## What Makes This Design Stronger

TarotAI is stronger than a simple tarot card app or a generic AI chat wrapper because the product layers reinforce each other:

| Strength | Why it matters |
| --- | --- |
| **Offline-first value** | Users can get a complete reading even before payment, account creation, or backend availability. This is stronger because `tarot-ai-generator` pre-generates rich card-and-dimension interpretation content into the local config database instead of relying on live AI for every reading. |
| **Structured tarot ritual** | The product keeps the familiar tarot sequence of choosing a topic, drawing cards, and reading a spread. AI supports the ritual instead of replacing it with an unstructured chat box. |
| **Two-tier interpretation** | Basic readings provide stable, low-cost value; AI readings provide premium personalization. This creates a clear upgrade path without making free users feel blocked. |
| **Dimension-based reasoning** | Every card is interpreted through a specific lens, so the result feels more relevant than generic card descriptions. |
| **Local content plus live AI** | Bundled content gives reliability; live AI adds personalization. The app is not fully dependent on either one alone. |
| **History as retention** | Saved readings give users a reason to return, compare past situations, and treat the app as a reflective journal. |
| **Card library as trust layer** | Users can inspect the card meanings behind the result, which makes both offline and AI interpretations feel less like a black box. |
| **Credits and fallback recharge** | The product can monetize AI usage while still supporting users who cannot use Google Play through redemption codes. |
| **Anonymous identity** | Users can start immediately while the product still has enough identity continuity for credits, purchases, and local history. |
| **Operator tooling** | The admin console gives the product a practical path for support, credit adjustment, order review, and campaign operations. |

The strongest product idea is the combination of **ritual, reliability, personalization, and operations**. The user sees a simple tarot experience, while the system underneath separates static content, user data, AI cost, monetization, and administration cleanly.

## Why Offline/Basic Readings Exist

Offline/basic reading is the product's low-friction entry point.

### User reasons

- **Immediate value:** users can complete a reading without paying, registering, or waiting for an AI service.
- **Trust building:** users can see the tarot flow and card meanings before spending credits.
- **Network resilience:** the reading remains useful when the backend or network is unavailable.
- **Learning support:** users can compare card position, upright/reversed meaning, and dimension-specific interpretation at their own pace.

### Business reasons

- **Lower first-session drop-off:** a free, available reading reduces the chance that users leave before understanding the product.
- **Clear upgrade path:** after a basic reading, AI reading becomes an enhancement rather than a requirement.
- **Lower AI cost exposure:** not every exploratory use needs an LLM call.

## How Offline/Basic Readings Are Implemented

The mobile app uses a dual local database design:

```text
Bundled config database       Runtime user database
assets/db/tarot_config.db  +  SQLite/tarot_user_data.db
read-only tarot content       user history and preferences
```

### Config database

The app bundles `assets/db/tarot_config.db` and copies it into the app's SQLite directory at startup. This database contains the product's read-only tarot content:

- 78 tarot cards;
- card image paths;
- spreads;
- reading dimensions;
- upright and reversed interpretations;
- dimension-specific interpretation content.

The startup path verifies required tables before allowing the app to continue. This prevents a broken release from silently showing incomplete tarot content.

Implementation references:

- `my-tarot-app/lib/database/connection.ts` — copies and verifies the bundled config database.
- `my-tarot-app/lib/services/CardService.ts` — reads card data and localized card names.
- `my-tarot-app/lib/services/CardInterpretationService.ts` — reads basic and dimension-specific interpretations.
- `my-tarot-app/app/(reading)/draw.tsx` — draws cards from local card data.
- `my-tarot-app/app/(reading)/basic.tsx` — builds the basic reading from local interpretations.

### User database

The user database is created separately as `tarot_user_data.db`. It stores data that belongs to the user:

- reading history;
- selected language preference;
- local user settings.

Keeping user data separate from tarot configuration lets the app update card content in a future release without deleting the user's history.

## Why `tarot-ai-generator` Strengthens Offline-First Design

Offline-first is not just a local cache. TarotAI's offline/basic reading is stronger because `tarot-ai-generator` turns expensive, reviewable AI work into reusable product content before the mobile app ships.

The generator reads tarot cards, upright/reversed meanings, dimensions, and translations from SQLite, renders locale-specific prompt templates, routes each language to the configured model, and exports structured JSON that can be reviewed and imported back into `tarot_config.db`.

```text
SQLite tarot content
  → card × direction × dimension generation jobs
  → locale-specific prompts and model routing
  → structured JSON with failures and model metadata
  → reviewed/imported dimension interpretations
  → bundled mobile config database
  → offline/basic readings on device
```

### Generator advantages

| Generator design | Offline-first advantage |
| --- | --- |
| **Bulk card × dimension generation** | The app can ship with many prewritten interpretations, so offline readings feel rich rather than like a small static lookup table. |
| **Prompt-template control** | Product tone can be tuned once in `prompt_template.txt` and `prompt_template.en.txt`, then applied consistently across generated content. |
| **Debug samples before bulk runs** | The team can test prompt quality on a small sample before spending tokens on a full dimension generation. |
| **Multi-language model routing** | Different locales can use different providers, models, temperatures, rate limits, and batch sizes. This keeps language quality and cost under control. |
| **Resume-friendly generation** | Completed card/language combinations are skipped on rerun, so long generation jobs can recover from interruptions without starting over. |
| **Failure lists and retry path** | Missing or failed outputs are explicit, making offline content production auditable instead of guesswork. |
| **Structured JSON outputs** | Generated content includes card context, dimension context, model metadata, and results, which makes human review and database import safer. |
| **Dry-run import support** | Content can be validated before writing back to SQLite, reducing the risk of corrupting the bundled config database. |
| **Question-driven generation path** | A product manager can define a real user question, match it to three dimensions, and generate a complete reusable content set for that scenario. |

### Product impact

This design makes offline/basic reading a real product surface rather than a fallback screen. Users get instant readings with dimension-specific text, while the business avoids paying for an LLM call every time someone tries the app. The live AI path then becomes a premium layer for personal context, not the only source of interpretive value.

Generator implementation references:

- `tarot-ai-generator/main.py` — CLI modes for debug samples, dimension generation, multilingual dimensions, and question-driven generation.
- `tarot-ai-generator/services/generation_service.py` — bulk orchestration, resume behavior, retry handling, and structured output merging.
- `tarot-ai-generator/services/prompt_builder.py` — localized prompt-template rendering.
- `tarot-ai-generator/services/model_router.py` — per-locale provider/model routing and rate limiting.
- `tarot-ai-generator/data_loader.py` — SQLite card and dimension loading with locale fallback.
- `tarot-ai-generator/scripts/import_dimension_results.py` — dry-run-safe import back into the SQLite config database.

Mobile implementation references:

- `my-tarot-app/lib/database/user-db.ts` — stores and queries user history and settings.
- `my-tarot-app/lib/services/HistoryService.ts` — history list, detail, search, delete, and stats behavior.
- `my-tarot-app/lib/services/ReadingService.ts` — saves completed reading results.

## Why AI Readings Exist

AI reading is the product's premium interpretation layer.

Basic tarot content is reusable and stable, but it cannot deeply understand a user's specific question. AI reading adds personalization by using the user's description, the drawn cards, and selected dimensions together.

### User reasons

- **Question-aware interpretation:** the same card can mean different things for parenting, work, romance, money, or health.
- **Less tarot expertise required:** users do not need to manually combine card, spread position, direction, and personal context.
- **More useful output:** AI can produce an overall summary and practical insights instead of only isolated card meanings.

### Business reasons

- **Natural monetization:** AI calls cost money, so credit usage maps to real variable cost.
- **Value differentiation:** basic reading gives a baseline; AI reading gives the premium experience.
- **Operational control:** credit checks, transaction logs, and admin tools make AI usage auditable.

## How AI Readings Are Implemented

AI reading is a two-step flow.

```text
User description
  → analyze intent and recommend dimensions
  → draw cards
  → generate personalized interpretation
```

### Step 1: Analyze the user's question

The user writes a question or situation description. The app sends it to the backend, which asks the LLM to recommend three reading dimensions for the three-card spread.

Implementation references:

- `my-tarot-app/app/(reading)/ai-input.tsx` — validates the 200-character input and calls analysis.
- `my-tarot-app/lib/services/AIReadingService.ts` — sends `POST /api/v1/readings/analyze` with locale and JWT headers.
- `tarot-backend/app/services/reading_service.py` — converts LLM recommendations into stable dimension entries and falls back to default dimensions if analysis fails.

### Step 2: Generate the final reading

After the user draws cards, the app sends the cards, directions, positions, dimensions, and original description to the backend. The backend calls the LLM and returns:

- per-card AI interpretations;
- dimension summaries;
- an overall summary;
- key insights;
- generation metadata.

Implementation references:

- `my-tarot-app/app/(reading)/ai-result.tsx` — builds the card payload and renders the AI result.
- `my-tarot-app/lib/services/AIReadingService.ts` — sends `POST /api/v1/readings/generate`.
- `tarot-backend/app/services/reading_service.py` — normalizes dimensions and builds the final interpretation response.

## AI Prompt Design Rationale

TarotAI uses prompts in two places:

1. **Runtime AI reading prompts** in `tarot-backend/app/services/llm_service.py` for analyzing a user's question and generating the final paid AI result.
2. **Content-generation prompts** in `tarot-ai-generator/prompt_template*.txt` for creating reusable card-and-dimension interpretation content that later powers offline/basic readings.

These prompts are written to protect the product experience, not only to get text from an LLM.

### Question-analysis prompt

The analysis prompt asks the model to choose one main category and then produce three related aspects for a three-card spread.

Product rationale:

- **One category keeps the reading focused.** A user asking about work should not receive one work dimension, one romance dimension, and one generic luck dimension unless the question truly demands it. A single category creates a coherent reading frame.
- **Three aspects match the ritual.** The app always draws three cards in this flow, so the prompt forces exactly three dimensions that map cleanly to the three positions.
- **Cause-to-outcome progression makes the result feel structured.** The prompt asks for aspects that describe development from root cause to current state to next step or likely outcome. This gives users a narrative instead of three disconnected labels.
- **A short unified summary helps downstream consistency.** The backend can pass one concise theme into generation and analytics instead of relying only on raw user text.
- **Fallback dimensions remain possible.** If the LLM fails or returns unusable data, the backend can fall back to default three-card dimensions without breaking the product flow.

### Final-reading prompt

The final prompt includes the user question, drawn cards, card directions, dimensions, and the card-to-dimension mapping, then requires a strict JSON response.

Product rationale:

- **The output must be machine-readable.** The app needs `card_interpretations`, `overall_summary`, and `insights` as separate UI sections. JSON prevents the mobile client from parsing free-form prose.
- **Exact card IDs prevent UI/data mismatch.** The prompt explicitly tells the model not to renumber or invent card IDs, because the result must attach to the actual cards the user drew.
- **One card maps to one dimension.** This keeps the reading easy to scan and prevents one card from over-explaining every possible theme.
- **The overall summary creates closure.** Users need a final synthesis after reading individual cards; otherwise the result feels like separate fragments.
- **Actionable insights make the AI result worth paying for.** The prompt rejects vague platitudes and asks for practical takeaways.
- **Locale-specific responses preserve product quality.** The backend builds language-specific prompts and passes locale through the API so the generated reading matches the user's language setting.

### Offline content-generation prompt

The generator prompt creates reusable interpretation content for a specific card, direction, category, and aspect.

Product rationale:

- **Traditional symbolism anchors the content.** The prompt starts from card name, orientation, core meaning, and detailed notes so generated text stays connected to tarot rather than becoming generic advice.
- **Dimension focus makes offline readings feel personalized.** Even without live AI, the same card can be interpreted differently for emotion, career, health, wealth, or decision topics.
- **Professional but approachable tone fits a consumer app.** The wording asks for guidance a general audience can understand, avoiding specialist-only tarot language.
- **Mystery plus practical guidance protects the tarot mood.** The prompt preserves a reflective, mystical tone while still giving suggestions users can act on.
- **No literal dates or timelines keeps content evergreen.** Offline content may live in the bundled database for a long time, so avoiding concrete dates prevents stale or falsely precise predictions.
- **No headings or bullets makes the content easy to embed.** The mobile UI can place the generated paragraph directly inside result cards without cleanup.

### Why the prompts avoid over-specific predictions

TarotAI is positioned as a reflection and guidance product, not a deterministic fortune-telling engine. The prompts intentionally prefer thematic, abstract, and supportive language over exact predictions. This has three benefits:

- it reduces the risk of making irresponsible claims;
- it keeps readings useful across different real-life contexts;
- it lets users treat tarot as a decision-support lens while keeping agency over their choices.

### Credit model

The product checks that the user has enough credits before entering AI reading. The current mobile flow expects two credits because analysis and generation are separate paid LLM steps.

Product benefit:

- users understand that AI reading is premium;
- failed AI calls should not consume credits;
- operators can audit credit usage through backend transactions and admin tools.

## Why the Reading Flow Is Split Into Steps

The reading flow is intentionally structured instead of using a single chat box.

```text
Choose reading type → choose topic or describe question → draw cards → read result
```

This structure gives the app a tarot-specific identity:

- the user still performs a card-draw ritual;
- the product can combine randomness, spread position, and interpretation data;
- AI enhances the tarot flow instead of replacing it with generic chat;
- each step has a clear success state and error state.

For offline/basic readings, the user selects a topic group. For AI readings, the user's question is analyzed into recommended dimensions. Both paths then share the same card drawing screen.

## Reading History Design

Reading history turns one-time readings into an ongoing reflective product.

### What is saved

Each completed reading stores:

- user id;
- timestamp;
- spread id;
- drawn card ids;
- interpretation mode (`default` or `ai`);
- locale;
- full reading result JSON.

Implementation references:

- `my-tarot-app/lib/database/user-db.ts` — inserts history with `interpretation_mode`, `locale`, and serialized result.
- `my-tarot-app/lib/services/HistoryService.ts` — supports list, detail, filtering, search, deletion, recent history, date range, and stats.
- `my-tarot-app/components/history/` — history list and detail UI components.

### Product benefits

- Users can revisit past questions and compare how situations changed.
- AI readings feel more durable because the result is not lost after the session.
- History increases return usage without requiring a formal account.
- Locale is stored with the result so past readings remain understandable after language changes.

## Card Library Design

The card library is the product's learning and trust layer.

It provides:

- all 78 tarot cards;
- Major and Minor Arcana filtering;
- card images;
- upright and reversed meanings;
- tarot history and usage guidance.

Implementation references:

- `my-tarot-app/app/cards/index.tsx` — card library page.
- `my-tarot-app/components/cards/` — card browsing UI.
- `my-tarot-app/lib/services/CardService.ts` — card list, filters, and localized card data.
- `my-tarot-app/assets/data/tarot_history.json` — tarot history and cultural background content.

### Product benefits

- Users can learn the system instead of treating AI output as a black box.
- The app remains useful even without starting a reading.
- Card details support better comprehension of both offline and AI readings.
- The library improves credibility by showing the underlying tarot vocabulary.

## Multilingual Design

TarotAI supports Chinese and English UI resources today, with an architecture that can add more languages later.

### Current language behavior

- The app detects the device language.
- The app stores the user's chosen language in local storage.
- Settings include a language selector.
- API requests include locale context through request body and `Accept-Language` headers.
- Card and interpretation services attempt localized database translations, then fall back to default content.

Implementation references:

- `my-tarot-app/lib/i18n/resources.ts` — available locales and translation namespaces.
- `my-tarot-app/lib/i18n/index.ts` — device detection, storage, initialization, and language switching.
- `my-tarot-app/components/settings/LanguageSection.tsx` — user-facing language selector.
- `my-tarot-app/lib/services/AIReadingService.ts` — sends locale to AI APIs.
- `tarot-backend/app/services/reading_service.py` — localizes category labels and fallback dimensions.

### Product benefits

- Public sharing is easier because the product can be presented in English.
- The same codebase can support different markets.
- AI output can follow the user's preferred language.
- Language choice is part of user settings rather than a hidden technical option.

## Backend Monetization and Control Design

The backend is the control plane for paid AI usage. It does not only expose reading APIs; it connects identity, balance, payments, redemption codes, Google Play verification, transactions, orders, and admin operations into one auditable system.

```text
Anonymous user / installation_id
  → user balance
  → AI reading credit checks
  → Google Play or redeem-code credit acquisition
  → purchase records
  → credit transactions
  → admin dashboard and support tools
```

### Why backend control matters

- **AI cost is enforced server-side.** The reading APIs check balance before LLM calls and deduct credits only after successful analysis or generation.
- **Payments become auditable.** Google Play purchases and redemption-code claims both create purchase records and credit transactions.
- **Multiple recharge channels share one balance.** Google Play, redemption codes, and admin adjustments all update the same user balance model.
- **Support does not require database access.** Admin APIs expose user lookup, credit adjustment, order review, redemption-code management, and exports.
- **Operations can see channel performance.** Dashboard logic separates Google Play orders, redemption-code orders, active codes, pending orders, and recent activity.

### Google Play verification path

The Google Play path verifies the purchase token against the Google Play Developer API before granting credits.

Product controls:

- service account initialization is explicit and can be disabled by configuration;
- purchase tokens are checked with Google before local fulfillment;
- already-processed purchase tokens return success without awarding duplicate credits;
- product IDs are mapped to credit amounts;
- purchase records store platform, order id, credits, amount, currency, token, and completion status;
- optional email can be bound to the anonymous user after successful verification;
- purchases can be consumed in Google Play and marked locally.

Implementation references:

- `tarot-backend/app/api/payments.py` — `/api/v1/payments/google/verify`, `/google/consume`, and Google webhook entry point.
- `tarot-backend/app/services/google_play.py` — Google Play token verification, duplicate-token handling, credit award, purchase records, and consumption.
- `tarot-backend/app/schemas/payment.py` — purchase verification request/response models with `installation_id`, `product_id`, `purchase_token`, and optional `email`.

### Redemption-code path

Redemption codes are a second monetization and operations channel. They are useful when Google Play is unavailable, when credits are sold or distributed outside the store, or when support needs to compensate a user.

Product controls:

- codes use secure random generation and avoid confusing characters;
- batches support campaign tracking;
- each code has credits, status, optional expiry, used user, and used timestamp;
- code information can be checked before use;
- daily usage limits reduce abuse;
- successful redemption creates both a purchase record and a credit transaction.

Implementation references:

- `tarot-backend/app/api/payments.py` — `/api/v1/payments/redeem` and `/redeem/info`.
- `tarot-backend/app/utils/redeem_code.py` — secure code generation, batch IDs, validation, daily limits, and batch stats.
- `tarot-backend/app/models/payment.py` — `RedeemCode` and `Purchase` data models.

### Credit ledger and balance safety

Credits are not just a number on the user. The backend keeps a balance table and a transaction ledger.

Product controls:

- `user_balance` stores the current balance and optimistic-lock version;
- `credit_transactions` records every earn, consume, refund, or admin adjustment;
- each transaction records balance after the change, reference type, reference id, description, and timestamp;
- user totals track total purchased and total consumed credits;
- insufficient balance blocks paid AI calls with a payment-required response.

Implementation references:

- `tarot-backend/app/services/user_service.py` — user creation, balance lookup, optimistic-lock balance updates, transaction creation, and admin adjustment.
- `tarot-backend/app/models/user.py` — `User` and `UserBalance`.
- `tarot-backend/app/models/transaction.py` — credit transaction ledger.
- `tarot-backend/app/api/readings.py` — server-side balance checks and post-success deductions for AI analyze/generate calls.
- `tarot-backend/app/api/users.py` — user balance, transaction history, stats, and credit consumption APIs.

### Admin and dashboard controls

The admin surface turns payment and credit operations into manageable product workflows.

Product controls:

- user list filters by installation id, email, email status, credit balance, and date range;
- user detail includes balance, totals, and recent transactions with platform and order context;
- admins can adjust credits for support, corrections, promotions, or refunds;
- order list filters by platform, status, installation id, email, order id, and date range;
- order detail shows the linked credit transactions;
- redemption-code management supports list, generation, status updates, batch filtering, and exports;
- dashboard metrics track users, active users, sold credits, orders, platform split, pending orders, and active codes.

Implementation references:

- `tarot-backend/app/api/admin.py` — admin user, order, purchase, and redemption-code APIs.
- `tarot-backend/app/services/dashboard_service.py` — operational metrics, platform distribution, recent activity, and system status.

### Product impact

This backend control layer makes the product stronger because monetization is not scattered across the client. The mobile app can stay simple, while the backend handles payment trust, balance safety, audit records, fallback channels, and operational recovery.

## Credits, Redemption Codes, and Purchase Channels

Credits are used to control paid AI usage.

### Why credits are used

- They decouple app-store purchase packages from individual AI calls.
- They let the product support multiple acquisition channels.
- They make promotions, manual grants, and customer support easier.
- They give users a visible balance before starting premium actions.

### Supported or planned channels

- **Google Play IAP:** used when Android and Google Play services are available.
- **Redemption codes:** a fallback for users who cannot use Google Play or need manually issued credits.
- **Admin adjustment:** operators can adjust user credits for support or operations.

Implementation references:

- `my-tarot-app/app/(reading)/type.tsx` — checks credit balance before AI reading.
- `my-tarot-app/components/settings/RechargeSection.tsx` — balance, Google Play purchase area, and redemption-code entry.
- `tarot-backend/app/api/payments.py` — frontend payment and redemption-related APIs.
- `tarot-backend/app/services/google_play.py` — Google Play purchase verification.
- `tarot-admin-web/` — operations console for users, orders, redemption codes, and dashboards.

### Product benefits

- AI cost is bounded by credits.
- Users without Play support still have a recharge path.
- Operators can separate Google Play, redemption-code, and manual credit sources for reporting.
- Failed or unavailable store flows can fall back to redemption codes instead of blocking the product.

## Anonymous Identity Design

TarotAI avoids mandatory registration. The product uses a stable anonymous installation identity and JWT authentication.

### Product reasons

- Tarot reading is often an emotional, low-commitment first session.
- Registration at first launch would add friction.
- Anonymous identity is enough for credits, history, and purchase verification on one installation.
- Optional email binding can be added when purchase or support flows need it.

Implementation references:

- `my-tarot-app/lib/services/AuthService.ts` — anonymous identity and token storage.
- `tarot-backend/app/api/users.py` — anonymous user registration.
- `tarot-backend/app/models/user.py` — backend user model.

## Admin Console Design

The admin console exists because a monetized AI product needs operations visibility.

Core operator needs:

- find users;
- inspect and adjust credits;
- generate and manage redemption codes;
- view purchase/order sources;
- monitor dashboard metrics;
- publish or inspect app release metadata.

Product benefit:

- customer-support actions do not require direct database access;
- credit and purchase behavior can be audited;
- redemption campaigns can be managed without mobile app changes;
- product metrics can guide future optimization.

## Why This Architecture Is Good for the Product

| Design choice | Product benefit |
| --- | --- |
| Offline/basic reading | Free, fast, resilient first experience. Stronger because `tarot-ai-generator` pre-produces dimension-specific content that works when payment, network, or live AI is unavailable. |
| AI reading as premium layer | Personalized value that justifies credit usage. Stronger because it upgrades an existing tarot flow rather than replacing it. |
| Dimension-based prompts | More coherent readings. Stronger because each card has a clear analytical role and the final result is not generic prose. |
| Dual local databases | App content can update without risking user history. Stronger because product content and personal data have different lifecycles. |
| Reading history | Turns a one-time ritual into a reusable reflection tool. Stronger because retention comes from the user's own past readings. |
| Card library | Builds learning value and trust in the interpretation system. Stronger because users can verify the vocabulary behind each reading. |
| Multilingual resources | Makes the product easier to share and expand across markets. Stronger because UI, content, and AI output can follow the user's language. |
| Backend payment control | Centralizes Google Play verification, redemption codes, balance updates, order records, and credit transactions. Stronger because the client does not decide payment trust or credit fulfillment. |
| Credits and redemption codes | Supports monetization, promotions, and fallback recharge paths. Stronger because payment failure does not fully block monetization. |
| Anonymous identity | Reduces onboarding friction while preserving enough continuity. Stronger because the first session stays lightweight while backend controls still attach credits and orders to a stable installation id. |
| Admin console | Gives operators control over users, credits, orders, redemption-code batches, and metrics. Stronger because support and campaigns do not require direct database work. |

## Known Product Boundaries

- Offline/basic reading uses bundled content. It is reliable but not personalized to a free-form user question.
- AI reading requires backend availability, credits, and LLM provider configuration.
- Google Play purchase depends on Android native build support and Play services availability.
- Offline history exists locally today; full cross-device sync should be treated as future product work unless explicitly implemented.
- Public documentation should remain English-only and share-safe.
