import { useEffect } from 'react'
import type { ThemePreference } from '../types'

export function useThemeEffect(theme: ThemePreference) {
  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    function apply() {
      const shouldDark = theme === 'dark' || (theme === 'system' && media.matches)
      root.classList.toggle('dark', shouldDark)
    }

    apply()
    if (theme === 'system') {
      media.addEventListener('change', apply)
      return () => media.removeEventListener('change', apply)
    }
  }, [theme])
}
