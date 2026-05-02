import { createContext, useContext, useEffect, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'auto'

interface ThemeState {
  theme: Theme
  setTheme: (t: Theme) => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeState>({
  theme: 'auto',
  setTheme: () => {},
  isDark: false,
})

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Dark mode dropped for doodle phase — always light
  useEffect(() => {
    document.documentElement.dataset.theme = 'light'
  }, [])

  return (
    <ThemeContext.Provider value={{ theme: 'light', setTheme: () => {}, isDark: false }}>
      {children}
    </ThemeContext.Provider>
  )
}
