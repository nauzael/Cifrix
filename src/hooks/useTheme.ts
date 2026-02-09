import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

type Theme = 'light' | 'dark';

export function useTheme() {
  const location = useLocation();
  const isSuperAdmin = location.pathname.startsWith('/super-admin');

  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    // Determine the effective theme based on route
    const effectiveTheme = isSuperAdmin ? theme : 'light';
    
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(effectiveTheme);
    
    // Only save preference if we are in super admin context (where choice is allowed)
    // Or we can save it always, but it only takes effect in superadmin
    if (isSuperAdmin) {
      localStorage.setItem('theme', theme);
    }
  }, [theme, isSuperAdmin]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return {
    theme: isSuperAdmin ? theme : 'light',
    toggleTheme,
    setTheme,
    isDark: isSuperAdmin && theme === 'dark'
  };
} 
