"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { UISettings, defaultSettings, loadSettings, saveSettings } from "@/lib/theme";

const UIContext = createContext<{ settings: UISettings; setSettings: (s: UISettings) => void }>({
    settings: defaultSettings,
    setSettings: () => { },
});

export const UIProvider = ({ children }: { children: ReactNode }) => {
    const [settings, setSettings] = useState<UISettings>(defaultSettings);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setSettings(loadSettings());
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        saveSettings(settings);
        document.documentElement.setAttribute("data-theme", settings.theme);
    }, [settings, mounted]);

    // Prevent hydration mismatch by rendering children only after mount, 
    // or render with default settings initially (though theme application happens in useEffect)
    // For smoother UX, we render children immediately but theme might flip. 
    // To avoid flash, we could block, but for now let's just render.

    return <UIContext.Provider value={{ settings, setSettings }}>{children}</UIContext.Provider>;
};

export const useUI = () => useContext(UIContext);
