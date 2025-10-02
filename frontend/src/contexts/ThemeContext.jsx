import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export const ThemeProvider = ({ children }) => {
  // LocalStorage'dan tema tercihini al, yoksa light default
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme')
    return savedTheme || 'light'
  })

  // Tema değiştiğinde localStorage'a kaydet ve HTML class'ını güncelle
  useEffect(() => {
    localStorage.setItem('theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
    
    // Body class'ını da güncelle
    if (theme === 'dark') {
      document.body.classList.add('dark-theme')
      document.body.classList.remove('light-theme')
    } else {
      document.body.classList.add('light-theme')
      document.body.classList.remove('dark-theme')
    }
  }, [theme])

  // Tema değiştirme fonksiyonu
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light')
  }

  // Belirli tema seçme fonksiyonu
  const setSpecificTheme = (newTheme) => {
    if (newTheme === 'light' || newTheme === 'dark') {
      setTheme(newTheme)
    }
  }

  // System theme detection (opsiyonel)
  const setSystemTheme = () => {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    setTheme(systemTheme)
  }

  const value = {
    theme,
    toggleTheme,
    setSpecificTheme,
    setSystemTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light'
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
