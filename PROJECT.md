# Zeery — Project Overview

> ภาพรวมโปรเจคแบบละเอียด อัพเดททุกครั้งที่มีการเปลี่ยนแปลง

---

## สรุปภาพรวม

Zeery เป็นแอป Personal Finance Tracker ใช้งานผ่านเบราว์เซอร์ ไม่ต้องสมัครสมาชิก ข้อมูล sync real-time ผ่าน Firebase Firestore มี AI assistant ช่วยวิเคราะห์การเงิน

---

## Tech Stack

| Layer | Technology | หมายเหตุ |
|-------|-----------|---------|
| Framework | React 18 + Vite + TypeScript | ไม่ใช่ Next.js — ไม่ต้องใช้ "use client" |
| Database | Firebase Firestore | Real-time subscriptions |
| Auth | Firebase Anonymous Auth | Auto-login, ไม่ต้อง sign up |
| AI Chat | OpenRouter API (Claude Sonnet) | เรียกตรงจาก frontend ด้วย `VITE_OPENROUTER_API_KEY` |
| Charts | Custom Canvas (`dotchart.ts`) + Recharts | Dashboard ใช้ Canvas, Report ใช้ Recharts |
| Icons | Lucide React | |
| Styling | CSS custom properties (var(--...)) | ไม่ใช้ Tailwind ใน components หลัก |
| Fonts | DM Sans (UI), DM Mono (ตัวเลข) | |
| Deployment | Vercel | `api/` directory สำหรับ Edge Functions |

---

## Environment Variables

| Variable | ใช้ที่ | หมายเหตุ |
|----------|-------|---------|
| `VITE_OPENROUTER_API_KEY` | `src/pages/AIChat.tsx` | สำหรับ AI Chat, ต้องอยู่ใน `.env` |
| `ANTHROPIC_API_KEY` | `api/chat.ts` (Vercel Edge) | สำหรับ deploy บน Vercel เท่านั้น |
| Firebase config | `src/lib/firebase.ts` | hardcoded (project `zeery-4c4c7`) |

---

## Pages และ Features

### 1. Dashboard (`/`)
- **Hero card** — Net balance เดือน/สัปดาห์ (ตัวใหญ่ ±฿), chips รายรับ/รายจ่าย/savings%
- **Bar charts** — รายรับ/รายจ่าย 28 วัน ใช้ Canvas `dotchart.ts` (pill bars + gradient + glow cap)
- **Budget overview** — progress bars per category
- **Savings goals** — CSS progress bars + %
- **Recent transactions** — 5 รายการล่าสุด + ไป Transactions page
- Context: รับ `period` (weekly/monthly) จาก AppShell outlet context

### 2. Transactions (`/transactions`)
- แสดงรายการทั้งหมด, filter by type (รายรับ/รายจ่าย/ทั้งหมด), ค้นหาชื่อ
- Filter by เดือน — subscribe แยก (ไม่ติด 60 วัน limit ของ `useTransactions`)
- Category colored tag chips
- Delete with double-tap confirm + Toast notification

### 3. Add Transaction (`/add`)
- Numpad กรอกจำนวนเงิน
- Quick chips จากรายการที่ใช้บ่อย (ดึงจาก transaction history)
- เลือก category, วันที่, โน้ต
- Toggle รายรับ/รายจ่าย

### 4. Slip OCR (`/slip`)
- อัพโหลดรูปสลิปโอนเงิน
- ส่งไป AI วิเคราะห์ → auto-fill form AddTransaction
- รองรับสลิป PromptPay, ธนาคารไทย

### 5. Budget (`/budget`)
- ตั้งวงเงินต่อ category
- Progress bars แสดง % ที่ใช้ไป
- เตือนเมื่อใกล้เกิน/เกินแล้ว
- 50/30/20 rule suggestion

### 6. Report (`/report`)
- Line chart รายรับ/รายจ่าย/ออม (Recharts)
- Range: 7 วัน / 6 เดือน / 12 เดือน
- Category breakdown (bar chart per category)
- Subscribe Firestore แยกสำหรับ date range ยาว

### 7. Recurring (`/recurring`)
- รายการประจำ: subscription, เงินเดือน
- ตั้ง dayOfMonth, ลิงก์กับ Savings Goal ได้
- Trigger manual ได้ทุกเมื่อ

### 8. Savings Goals (`/savings`)
- ตั้งเป้าออม: ชื่อ, target, ยอดปัจจุบัน, monthly amount, deadline
- บันทึกความคืบหน้า (ออมเพิ่ม)
- localStorage keys: `zeery-savings-pct`, `zeery-savings-fixed`

### 9. Net Worth (`/networth`)
- บันทึก Assets (cash, investment, property, other)
- บันทึก Liabilities (credit, loan, other)
- คำนวณ Net Worth = Assets − Liabilities อัตโนมัติ

### 10. Export (`/export`)
- **CSV** — ไฟล์ `zeery-transactions-*.csv`
- **JSON** — ไฟล์ `zeery-backup-*.json`
- **PDF** — Preview ใน browser + print A4
  - Branded header (สีส้ม #e85d24), category colored bars, footer
  - React Portal (`createPortal`) render `#print-area` เป็น direct body child
  - Print CSS: `@media print { body > * { display: none } body > #print-area { display: block } }`

### 11. AI Chat (`/ai`)
- ผู้ช่วยวางแผนการเงิน — ถามได้ทุกอย่าง, ตอบเป็นภาษาไทย/อังกฤษตามที่ถาม
- **Context อัตโนมัติ**: ดึงข้อมูลจริงของผู้ใช้ (รายรับ/รายจ่าย by category, budget status, goals, net worth)
- **Streaming**: OpenRouter API → SSE → chunk-by-chunk render
- Multi-turn: ส่ง conversation history ทั้งหมดทุกครั้ง (จำ context)
- Suggestion chips (Thai presets)
- Blinking cursor ขณะ stream, animated typing dots ขณะรอ

---

## Architecture

### Routing
```
App.tsx → BrowserRouter → AppShell (layout)
  ├── /              → Dashboard
  ├── /transactions  → Transactions
  ├── /add           → AddTransaction
  ├── /budget        → Budget
  ├── /savings       → Savings
  ├── /networth      → NetWorth
  ├── /recurring     → Recurring
  ├── /report        → Report
  ├── /export        → Export
  ├── /slip          → SlipOCR
  └── /ai            → AIChat
```

### Layout (AppShell)
```
TopBar (56px, sticky) — โลโก้ Zeery, period toggle, theme toggle
├── Sidebar (200px, desktop only) — navMain + navOther
└── main (flex 1, paddingBottom 72px)
    └── <Outlet /> ← page content
BottomNav (64px, fixed bottom, mobile only)
  [หลัก] [รายการ] [+FAB] [Budget] [AI]
```

### Data Layer
```
Firebase Firestore
  users/{uid}/
    transactions/{id}    — name, catId, amount(+/-), date, note, source, createdAt
    budgets/{catId}      — catId, limit, updatedAt
    goals/{id}           — name, target, saved, monthlyAmount, deadline, createdAt
    assets/{id}          — label, type(cash/investment/property/other), value, updatedAt
    liabilities/{id}     — label, type(credit/loan/other), value, updatedAt
    recurring/{id}       — name, catId, amount, dayOfMonth, type, goalId, active, lastCreated

Amount convention: บวก (+) = รายรับ, ลบ (−) = รายจ่าย/โอนออม
```

### Hooks
| Hook | ดึงข้อมูล | หมายเหตุ |
|------|---------|---------|
| `useAuth` | uid จาก Anonymous Auth | persist ใน browser IndexedDB |
| `useTransactions` | 60 วันย้อนหลัง | real-time subscription |
| `useBudget` | budgets collection | real-time |
| `useGoals` | goals collection | real-time |
| `useNetWorth` | assets + liabilities | real-time, 2 subscriptions |

### Theme System
- `ThemeContext.tsx` — 3 modes: light / dark / auto
- `localStorage` key: `zeery-theme`
- ใช้ `document.documentElement.dataset.theme = 'dark' | 'light'`
- CSS vars defined in `index.css` หรือ `:root[data-theme=dark]`

---

## File Structure

```
Zeery/
├── api/
│   └── chat.ts              Vercel Edge Function — Anthropic proxy (ใช้ตอน deploy)
├── src/
│   ├── components/
│   │   ├── dashboard/
│   │   │   └── DotChart.tsx         Canvas chart wrapper component
│   │   ├── layout/
│   │   │   ├── AppShell.tsx         Layout wrapper (TopBar + Sidebar + BottomNav)
│   │   │   ├── TopBar.tsx           Header bar, period toggle, theme toggle
│   │   │   ├── Sidebar.tsx          Desktop sidebar navigation
│   │   │   └── BottomNav.tsx        Mobile bottom navigation (5 tabs + FAB)
│   │   ├── slip/
│   │   │   ├── SlipUpload.tsx       File upload UI
│   │   │   └── SlipConfirm.tsx      Preview + confirm OCR result
│   │   └── ui/
│   │       ├── ConfirmButton.tsx    Double-tap confirm pattern
│   │       └── Toast.tsx            Toast notification
│   ├── contexts/
│   │   ├── AuthContext.tsx          Anonymous auth provider
│   │   └── ThemeContext.tsx         Theme provider (light/dark/auto)
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTransactions.ts       60-day window
│   │   ├── useBudget.ts
│   │   ├── useGoals.ts
│   │   └── useNetWorth.ts
│   ├── lib/
│   │   ├── firebase.ts              Firebase init (project zeery-4c4c7)
│   │   ├── firestore.ts             CRUD + subscribe functions
│   │   ├── catIcons.ts              Category → Lucide icon map
│   │   └── dotchart.ts             Canvas dot/bar/ring chart engine
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Transactions.tsx
│   │   ├── AddTransaction.tsx
│   │   ├── SlipOCR.tsx
│   │   ├── Budget.tsx
│   │   ├── Report.tsx
│   │   ├── Recurring.tsx
│   │   ├── Savings.tsx
│   │   ├── NetWorth.tsx
│   │   ├── Export.tsx
│   │   └── AIChat.tsx               AI financial assistant chat
│   ├── types/
│   │   └── index.ts                 Transaction, Budget, SavingsGoal, Asset, Liability, Recurring, CATEGORIES
│   ├── App.tsx                      Router + routes
│   └── main.tsx                     Entry point
├── .env                             VITE_OPENROUTER_API_KEY
├── index.html                       Title: Zeery
├── vite.config.ts
├── PROJECT.md                       (ไฟล์นี้) ภาพรวมโปรเจค
└── README.md                        Quick start
```

---

## Key Implementation Notes

- **Canvas charts** (`dotchart.ts`): bar type ใช้ pill-shaped bars (roundRect polyfill สำหรับ Safari < 15.4), gradient fill (transparent → full color), glow cap dot ด้วย `shadowBlur`
- **PDF Print**: ใช้ `createPortal` render `#print-area` เป็น direct child ของ `<body>`, ใช้ `useEffect` trigger `window.print()` หลัง React render เสร็จ — แก้ปัญหาหน้าขาว
- **AI Chat**: เรียก OpenRouter โดยตรงจาก frontend (ไม่ผ่าน backend) ใช้ `VITE_OPENROUTER_API_KEY`, parse SSE ด้วย `ReadableStream` reader
- **Anonymous Auth**: UID persist ใน browser IndexedDB — ล้าง browser data = ข้อมูลหาย
- **`useTransactions`** โหลดแค่ 60 วัน, Transactions page subscribe แยกต่างหากเพื่อดู history ยาวกว่า

---

## Changelog

| วันที่ | การเปลี่ยนแปลง |
|-------|--------------|
| 2026-04-30 | Custom categories — เพิ่ม/ลบ category ของตัวเองได้, sync Firestore, `CategoriesContext` ครอบทุก page |
| 2026-04-30 | สร้าง AIChat page (`/ai`) — OpenRouter streaming, multi-turn context, suggestion chips |
| 2026-04-30 | เปลี่ยนชื่อ product จาก Flow → Zeery (TopBar, title, localStorage keys) |
| 2026-04-30 | Dashboard hero card — net balance ตัวใหญ่ + chips รายรับ/รายจ่าย/savings% |
| 2026-04-30 | Dashboard savings goals — เปลี่ยนเป็น CSS progress bars + % |
| 2026-04-30 | `dotchart.ts` — เปลี่ยน bar chart เป็น pill bars + gradient + glow cap |
| 2026-04-30 | Export PDF — branded header, category hex colors, portal-based print fix |
| 2026-04-30 | Transactions — filter by month (unlimited history) |
| ก่อนหน้า | Confirm delete, Toast notifications, Lucide icons, Category chips |
| ก่อนหน้า | Slip OCR, Budget, Report, Recurring, Savings, Net Worth, Export |
| ก่อนหน้า | Dashboard, Anonymous auth, Firestore real-time sync |
