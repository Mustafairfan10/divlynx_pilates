# Divlynx Pilates — Studio Manager

A local-first Pilates studio management app built with Next.js 16, React 19, Tailwind v4 and Dexie (IndexedDB).
All data lives on the device, so every feature works offline. It installs as a PWA.

## Run

```bash
npm install
npm run dev          # development (service worker disabled)
npm run build && npm start   # production — enables offline app shell + install
```

On first launch the app seeds a realistic demo studio. Use **Settings → Data** to reset the demo, erase everything, or back up and restore (JSON).

## Features

- **Dashboard**: today's classes, attendance, revenue trend, occupancy, renewals/low credits/waivers/equipment alerts, birthdays, activity feed
- **Schedule**: week/day/list calendar, filters, click-to-create, recurring series, edit/cancel/restore sessions
- **Session roster**: book members, waitlist with auto-promotion, check-in / no-show / late-cancel rules, drop-ins, spot numbers, health-note flags
- **Check-in desk**: today's classes, quick search, walk-ins, one-tap check-in
- **Members**: search, filters (renewing, no plan, leads…), profile with memberships, credits, freeze/unfreeze, booking history, payments, health and waiver info, CSV export
- **Plans & pricing**: class packs, unlimited, intro offers, private packages
- **Payments**: sell memberships, retail/drop-in/fees, pending invoices, refunds, printable invoices, CSV export
- **Instructors**: profiles, specialties, monthly payroll (group and private rates)
- **Classes & rooms**: class types (level, duration, capacity, credit cost, color), room capacities
- **Equipment**: service intervals, maintenance status, overdue alerts
- **Reports**: revenue by type, attendance trend, peak-time heatmap, class/plan/lead-source mix, retention, instructor performance
- **Settings**: studio profile, cancellation and no-show policies, currency/locale/tax, hours, theme, storage status
- Command palette (Ctrl/⌘ K), light/dark/system theme, responsive mobile layout with a bottom nav

## Offline

- `public/sw.js` precaches every route and its JS/CSS/font assets on install. Navigations fall back to the cache.
- Data is stored in IndexedDB (`src/lib/db.ts`), and persistent storage is requested.
- Because data is per-device, download backups regularly from Settings.

## Code map

- `src/lib/`: types, Dexie schema, business logic (`logic.ts`: booking, credits, waitlist, sales), demo seed
- `src/components/`: UI kit, overlays (modal/sheet/toast/confirm), app shell, charts, domain components (session sheet, member sheet, sell modal…)
- `src/app/*/page.tsx`: one route per area
