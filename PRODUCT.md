# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary (public site):** curious first-timers — locals who have never done Pilates, often a little intimidated by reformers, unsure what to wear, whether they are "fit enough", and what a first class costs. Their job: decide the studio is safe and welcoming for a beginner, then take the first step (intake form, intro offer, first class).
- **Secondary (public site):** returning members who come back to reserve a class with their email or buy a pack.
- **Staff (admin app at `/admin`):** studio owner and front desk running schedule, members, check-in, sales and reports.

## Product Purpose

Divlynx Pilates is a demo / portfolio studio-management product: a local-first Next.js app with a staff side (`/admin`) and a public side (`/`, `/shop`, `/join`). The public side exists to turn a nervous first-timer into a booked first class. Success = a visitor completes the first-visit intake form and picks up the intro offer or reserves a class.

## Positioning

A beginner-first studio front door wired directly into the studio's own operations: the public timetable shows real spots left from the live schedule, the shop sells the studio's actual passes and products, and the intake form (body map, health screening, signed waiver) lands on the member's profile for instructors before their first class.

## Operating Context

- Data is local-first (IndexedDB on the device). Public submissions only reach the studio records when made on the studio's own device (e.g. a front-desk tablet); there is no backend sync yet.
- No online card payments: orders are reserved and paid at the front desk.
- Works offline via a service worker; installable as a PWA.
- Studio facts in demo data: reformer, mat, tower, barre, chair and private formats; small classes (max ~10 on reformer); five instructors; 12-hour cancellation window.

## Capabilities and Constraints

- Public: landing page, live 7-day timetable with reserve-by-email, storefront (passes + retail essentials, bag, pay-at-studio checkout), 5-step intake form with body map and drawn signature.
- Staff: dashboard, schedule, check-in, members (incl. intake card), instructors/payroll, plans & products, payments, reports, settings.
- Studio name, contact details, hours, prices, classes and instructors come from the app's settings and data and can change; the public site must read them, not hard-code them.
- Undecided: a backend/sync layer, real online payments, authentication for `/admin`.

## Brand Commitments

None binding. The name "Divlynx Pilates" and the current logo mark are demo placeholders and may be redesigned.

## Evidence on Hand

- No real photos, logo, brand guide, testimonials, reviews, press or client results exist.
- All instructors, members, quotes and numbers are synthetic demo data. Testimonials, ratings and "client results" must not be presented as real; any illustrative quote or person must be visibly labeled as sample content.
- Real, derivable facts the site may show: live class schedule and spots left, class formats/levels/durations, plan prices, product catalogue, studio policies (cancellation window), hours and address from settings.

## Product Principles

1. Beginner-first: answer the first-timer's fears (what happens, what to bring, am I fit enough, what does it cost) before asking for anything.
2. Show the real studio working: live schedule, real prices and policies beat adjectives.
3. One clear next step on every screen: intake form → intro offer → first class.
4. Honest by default: no invented proof; illustrative content is labeled.
5. Same product, two doors: switching between the public site and staff app is always one tap away.

## Accessibility & Inclusion

Audience includes people with injuries, pregnancy and limited mobility: respect `prefers-reduced-motion`, keep text contrast AA or better, keep tap targets large, and never rely on colour alone for state.
