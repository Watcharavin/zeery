import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Transaction, Budget, SavingsGoal, Asset, Liability, Recurring, Category } from '../types'

// ── helpers ──────────────────────────────────────────────────────────────────

function userCol(uid: string, sub: string) {
  return collection(db, 'users', uid, sub)
}

function userDoc(uid: string, sub: string, id: string) {
  return doc(db, 'users', uid, sub, id)
}

// ── transactions ─────────────────────────────────────────────────────────────

export function subscribeTransactions(
  uid: string,
  cb: (txs: Transaction[]) => void,
  constraints: QueryConstraint[] = [],
) {
  const q = query(userCol(uid, 'transactions'), orderBy('date', 'desc'), ...constraints)
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Transaction))
  })
}

export async function addTransaction(uid: string, tx: Omit<Transaction, 'id' | 'createdAt'>) {
  return addDoc(userCol(uid, 'transactions'), { ...tx, createdAt: Timestamp.now() })
}

export async function deleteTransaction(uid: string, id: string) {
  return deleteDoc(userDoc(uid, 'transactions', id))
}

export async function updateTransaction(uid: string, id: string, data: Partial<Transaction>) {
  return updateDoc(userDoc(uid, 'transactions', id), data)
}

// ── budgets ──────────────────────────────────────────────────────────────────

export function subscribeBudgets(uid: string, cb: (budgets: Budget[]) => void) {
  return onSnapshot(userCol(uid, 'budgets'), snap => {
    cb(snap.docs.map(d => d.data() as Budget))
  })
}

export async function setBudget(uid: string, catId: string, limit: number) {
  return setDoc(userDoc(uid, 'budgets', catId), {
    catId,
    limit,
    updatedAt: Timestamp.now(),
  })
}

export async function deleteBudget(uid: string, catId: string) {
  return deleteDoc(userDoc(uid, 'budgets', catId))
}

// ── savings goals ─────────────────────────────────────────────────────────────

export function subscribeGoals(uid: string, cb: (goals: SavingsGoal[]) => void) {
  return onSnapshot(userCol(uid, 'goals'), snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() }) as SavingsGoal))
  })
}

export async function addGoal(uid: string, goal: Omit<SavingsGoal, 'id' | 'createdAt'>) {
  return addDoc(userCol(uid, 'goals'), { ...goal, createdAt: Timestamp.now() })
}

export async function updateGoal(uid: string, id: string, data: Partial<SavingsGoal>) {
  return updateDoc(userDoc(uid, 'goals', id), data)
}

export async function deleteGoal(uid: string, id: string) {
  return deleteDoc(userDoc(uid, 'goals', id))
}

// ── assets ────────────────────────────────────────────────────────────────────

export function subscribeAssets(uid: string, cb: (assets: Asset[]) => void) {
  return onSnapshot(userCol(uid, 'assets'), snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Asset))
  })
}

export async function addAsset(uid: string, asset: Omit<Asset, 'id' | 'updatedAt'>) {
  return addDoc(userCol(uid, 'assets'), { ...asset, updatedAt: Timestamp.now() })
}

export async function updateAsset(uid: string, id: string, data: Partial<Asset>) {
  return updateDoc(userDoc(uid, 'assets', id), { ...data, updatedAt: Timestamp.now() })
}

export async function deleteAsset(uid: string, id: string) {
  return deleteDoc(userDoc(uid, 'assets', id))
}

// ── liabilities ───────────────────────────────────────────────────────────────

export function subscribeLiabilities(uid: string, cb: (items: Liability[]) => void) {
  return onSnapshot(userCol(uid, 'liabilities'), snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Liability))
  })
}

export async function addLiability(uid: string, item: Omit<Liability, 'id' | 'updatedAt'>) {
  return addDoc(userCol(uid, 'liabilities'), { ...item, updatedAt: Timestamp.now() })
}

export async function updateLiability(uid: string, id: string, data: Partial<Liability>) {
  return updateDoc(userDoc(uid, 'liabilities', id), { ...data, updatedAt: Timestamp.now() })
}

export async function deleteLiability(uid: string, id: string) {
  return deleteDoc(userDoc(uid, 'liabilities', id))
}

// ── recurring ─────────────────────────────────────────────────────────────────

export function subscribeRecurring(uid: string, cb: (items: Recurring[]) => void) {
  return onSnapshot(userCol(uid, 'recurring'), snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Recurring))
  })
}

export async function addRecurring(uid: string, item: Omit<Recurring, 'id'>) {
  return addDoc(userCol(uid, 'recurring'), item)
}

export async function updateRecurring(uid: string, id: string, data: Partial<Recurring>) {
  return updateDoc(userDoc(uid, 'recurring', id), data)
}

export async function deleteRecurring(uid: string, id: string) {
  return deleteDoc(userDoc(uid, 'recurring', id))
}

// ── custom categories ─────────────────────────────────────────────────────────

export function subscribeCategories(uid: string, cb: (cats: Category[]) => void) {
  return onSnapshot(userCol(uid, 'categories'), snap => {
    cb(snap.docs.map(d => ({ ...d.data(), id: d.id }) as Category))
  })
}

export async function addCustomCategory(uid: string, cat: Omit<Category, 'id'>) {
  return addDoc(userCol(uid, 'categories'), cat)
}

export async function deleteCustomCategory(uid: string, id: string) {
  return deleteDoc(userDoc(uid, 'categories', id))
}

// ── month filter helper ───────────────────────────────────────────────────────

export function monthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`
  return [where('date', '>=', start), where('date', '<', end)]
}
