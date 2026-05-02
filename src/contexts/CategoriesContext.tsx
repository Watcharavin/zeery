import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { subscribeCategories, addCustomCategory, deleteCustomCategory } from '../lib/firestore'
import { CATEGORIES, type Category } from '../types'

interface CategoriesState {
  categories: Category[]
  getCat: (id: string) => Category
  addCategory: (cat: Omit<Category, 'id'>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
}

const CategoriesContext = createContext<CategoriesState>({
  categories: CATEGORIES,
  getCat: (id) => CATEGORIES.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1],
  addCategory: async () => {},
  deleteCategory: async () => {},
})

export function useCategories() {
  return useContext(CategoriesContext)
}

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const { uid } = useAuth()
  const [custom, setCustom] = useState<Category[]>([])

  useEffect(() => {
    if (!uid) return
    return subscribeCategories(uid, setCustom)
  }, [uid])

  // built-in first, then custom (so custom can override if same id)
  const categories: Category[] = [...CATEGORIES, ...custom]

  function getCat(id: string): Category {
    return categories.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]
  }

  async function addCategory(cat: Omit<Category, 'id'>) {
    if (!uid) return
    await addCustomCategory(uid, { ...cat, custom: true } as Omit<Category, 'id'>)
  }

  async function deleteCategory(id: string) {
    if (!uid) return
    await deleteCustomCategory(uid, id)
  }

  return (
    <CategoriesContext.Provider value={{ categories, getCat, addCategory, deleteCategory }}>
      {children}
    </CategoriesContext.Provider>
  )
}
