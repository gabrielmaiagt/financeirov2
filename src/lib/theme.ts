export type Theme = "default" | "cartoon" | "retro" | "neon";
export type Layout = "tabs" | "sidebar" | "topbar";

export interface UISettings {
    theme: Theme;
    layout: Layout;
}

export const defaultSettings: UISettings = {
    theme: "default",
    layout: "tabs",
};

export const loadSettings = (): UISettings => {
    if (typeof window === "undefined") return defaultSettings;
    try {
        const stored = localStorage.getItem("uiSettings");
        return stored ? JSON.parse(stored) : defaultSettings;
    } catch {
        return defaultSettings;
    }
};

export const saveSettings = (settings: UISettings) => {
    if (typeof window !== "undefined") {
        localStorage.setItem("uiSettings", JSON.stringify(settings));
    }
};
