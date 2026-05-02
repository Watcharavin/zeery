import { Timestamp } from 'firebase/firestore'

export interface Transaction {
  id: string
  name: string
  catId: string
  amount: number // บวก = รายรับ, ลบ = รายจ่าย
  date: string   // YYYY-MM-DD
  note?: string
  source?: 'manual' | 'ocr' | 'recurring'
  createdAt: Timestamp
}

export interface Budget {
  catId: string
  limit: number  // บาท/เดือน
  updatedAt: Timestamp
}

export interface SavingsGoal {
  id: string
  name: string
  target: number
  saved: number
  monthlyAmount: number
  deadline?: Timestamp
  createdAt: Timestamp
}

export interface Asset {
  id: string
  label: string
  type: 'cash' | 'investment' | 'property' | 'other'
  value: number
  updatedAt: Timestamp
}

export interface Liability {
  id: string
  label: string
  type: 'credit' | 'loan' | 'other'
  value: number
  updatedAt: Timestamp
}

export interface Recurring {
  id: string
  name: string
  catId: string
  amount: number
  dayOfMonth: number
  type: 'expense' | 'income' | 'savings'
  goalId?: string
  active: boolean
  lastCreated?: Timestamp
}

export interface Category {
  id: string
  label: string
  color: string
  emoji: string
  custom?: boolean
}

export const CATEGORIES: Category[] = [
  { id: 'food',      label: 'อาหาร',   color: '#f59e0b', emoji: '🍜' },
  { id: 'travel',    label: 'เดินทาง', color: '#3b82f6', emoji: '🚗' },
  { id: 'entertain', label: 'บันเทิง', color: '#8b5cf6', emoji: '🎬' },
  { id: 'home',      label: 'บ้าน',    color: '#10b981', emoji: '🏠' },
  { id: 'health',    label: 'สุขภาพ',  color: '#ef4444', emoji: '💊' },
  { id: 'savings',   label: 'ออม',     color: '#e85d24', emoji: '🏦' },
  { id: 'income',    label: 'รายรับ',  color: '#16a34a', emoji: '💰' },
  { id: 'other',     label: 'อื่นๆ',   color: '#6b7280', emoji: '📌' },
]

export function getCategoryById(id: string): Category {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]
}
