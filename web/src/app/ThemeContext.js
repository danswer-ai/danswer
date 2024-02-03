"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState('light');

    useEffect(() => {
        const storedTheme = localStorage.getItem('darkMode');
        const isDarkMode = storedTheme === 'true';
        setTheme(isDarkMode ? 'dark' : 'light');
        document.documentElement.classList.toggle('dark', isDarkMode);
    }, []);

    const toggleTheme = () => {
        const isDarkMode = theme === 'dark';
        const newTheme = isDarkMode ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('darkMode', !isDarkMode ? 'true' : 'false');
        document.documentElement.classList.toggle('dark', !isDarkMode);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
