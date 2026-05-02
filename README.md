# Zeery — Personal Finance Tracker

แอปติดตามการเงินส่วนตัว ใช้งานง่าย ไม่ต้องสมัครสมาชิก เปิดเบราว์เซอร์แล้วใช้ได้เลย

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + Vite + TypeScript |
| Database | Firebase Firestore (real-time sync) |
| Auth | Firebase Anonymous Auth (auto, ไม่ต้อง login) |
| Charts | Recharts (line) + roughjs (hand-drawn canvas) |
| Icons | Lucide React |
| Styling | CSS custom properties + Tailwind CSS |

---

## Features

- **Dashboard** — สรุปรายรับ/รายจ่าย/ออมเดือนนี้ + dot chart + รายการล่าสุด + budget overview
- **Transactions** — ดูรายการทั้งหมด, ค้นหา, filter by type/category
- **Add Transaction** — numpad กรอกเงิน, quick chips จากประวัติ, เลือก category, วันที่, โน้ต
- **Slip OCR** — สแกนสลิปโอนเงินด้วย AI แล้ว auto-fill รายการ
- **Budget** — ตั้งวงเงินต่อหมวด, progress bar, แจ้งเตือนเกิน, 50/30/20 rule suggestion
- **Report** — line chart รายรับ/รายจ่าย/ออม (7 วัน / 6 เดือน / 12 เดือน) + breakdown per category
- **Recurring** — รายการประจำ (subscription, เงินเดือน), trigger manual ได้
- **Savings Goals** — ตั้งเป้าออม, บันทึกความคืบหน้า, กำหนด deadline
- **Net Worth** — บันทึก assets และ liabilities, คำนวณ net worth อัตโนมัติ
- **Export** — export CSV, JSON, PDF พร้อม preview (branded A4, category colors)
- **AI Chat** — Zeery AI ผู้ช่วยวางแผนการเงิน ถามได้ทุกอย่าง ดึงข้อมูลจริงของคุณ streaming

---

## Data Structure (Firestore)

```
users/{uid}/
  transactions/{id}     — name, catId, amount, date, note, source, createdAt
  budgets/{catId}       — catId, limit, updatedAt
  goals/{id}            — name, target, saved, monthlyAmount, deadline, createdAt
  assets/{id}           — label, type, value, updatedAt
  liabilities/{id}      — label, type, value, updatedAt
  recurring/{id}        — name, catId, amount, dayOfMonth, type, goalId, active, lastCreated
```

**Amount convention:** บวก (+) = รายรับ, ลบ (-) = รายจ่าย/โอนออม

**Categories:** food, travel, entertain, home, health, savings, income, other

---

## How to Run

```bash
npm install
npm run dev    # http://localhost:5173
npm run build  # production build
```

Firebase config: `src/lib/firebase.ts` — project `zeery-4c4c7`

---

## Project Structure

```
src/
  components/
    dashboard/      DotChart
    layout/         AppShell, TopBar, Sidebar, BottomNav
    ui/             RoughButton, RoughProgress, ConfirmButton, Toast
    slip/           SlipUpload, SlipConfirm
  contexts/
    AuthContext.tsx       — Anonymous auth provider
    CategoriesContext.tsx — Custom categories
  hooks/
    useAuth.ts
    useTransactions.ts   — real-time, 60 days window
    useBudget.ts
    useGoals.ts
    useNetWorth.ts
    useRecurring.ts
  lib/
    firebase.ts      — Firebase init
    firestore.ts     — CRUD + subscribe functions
    dotchart.ts      — roughjs hand-drawn canvas charts
    catIcons.ts      — Category icon map (Lucide)
  pages/
    Dashboard, Transactions, AddTransaction
    SlipOCR, Budget, Report
    Recurring, Savings, NetWorth, Export, AIChat
    Categories
  types/
    index.ts         — Transaction, Budget, SavingsGoal, Asset, Liability, Recurring, CATEGORIES
  index.css          — Design tokens (--bg, --accent, --shadow, --border, etc.)
```

---

## Notes

- ข้อมูลผูกกับ Anonymous UID ที่ persist ใน browser IndexedDB อัตโนมัติ
- ล้าง browser data = ข้อมูลหาย (ยังไม่มี account linking)
- `useTransactions` hook โหลดแค่ 60 วันย้อนหลัง เพื่อประหยัด Firestore reads
- Report page subscribe แยก สำหรับ date range ยาวกว่า 60 วัน

---

## Roadmap

### Done
- [x] Anonymous auth + Firestore real-time sync
- [x] Dashboard dot chart + budget overview
- [x] Add transaction (numpad + quick chips)
- [x] Slip OCR (AI scan)
- [x] Budget tracking + 50/30/20 rule
- [x] Report (line chart + category breakdown)
- [x] Recurring transactions
- [x] Savings goals
- [x] Net worth tracker
- [x] Export CSV / JSON / PDF
- [x] Dark/light/auto theme
- [x] Lucide icons (replaced all emoji)
- [x] Category colored tag chips in transaction list
- [x] Confirm dialog before delete (double-tap pattern, all pages)
- [x] Toast notifications after every action (save, delete, edit)

- [x] Transactions page: filter by month (subscribeTransactions per month, unlimited history)
- [x] Dashboard: net balance hero card (large ± balance) + savings goal progress bar with %
- [x] PDF Export: branded header, category colored bars, professional footer, print A4 CSS
- [x] Rename Flow → Zeery (branding)
- [x] AI Chat (Zeery AI) — streaming, multi-turn, financial context injected as system prompt
- [x] Custom categories — add/edit/delete with color + icon picker
- [x] Recurring transactions — auto-create ทุกต้นเดือน, trigger manual ได้

### Visual Polish (Phase 5)
- [x] **roughjs hand-drawn charts** — DotChart ใช้ rough.canvas() แทน smooth canvas
- [x] **Mobile navigation** — hamburger + drawer overlay, BottomNav tabs
- [x] **Border normalization** — 1px ทุกที่ (เลิกใช้ 2px/3px ยกเว้น active tab indicator)
- [x] **Design tokens** — parchment bg, layered shadows, 16px radius, Caveat/Kalam fonts
- [x] **Dashboard hero card** — left accent border + gradient bg, balance ขนาดใหญ่
- [x] **Empty states** — emoji + description + action button ทุกหน้า
- [x] **AIChat height fix** — responsive height (mobile -64px BottomNav, desktop no deduction)
- [x] **Responsive grid** — 2-col breakpoint ที่ 1023px ด้วย CSS attribute selector

### Planned
- [ ] Onboarding flow ครั้งแรก
- [ ] Monthly insight: เปรียบเทียบกับเดือนที่แล้ว
- [ ] Dark mode support
