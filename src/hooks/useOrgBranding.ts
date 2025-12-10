'use client';

import { useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';

/**
 * Hook to apply organization branding (colors, logo) dynamically.
 * Sets CSS variables on the document root for use in themes.
 */
export function useOrgBranding() {
    const { organization } = useOrganization();
    const branding = organization?.branding;

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const root = document.documentElement;

        // Apply custom primary color if set
        if (branding?.primaryColor) {
            // Convert hex to HSL for Tailwind compatibility
            const hsl = hexToHsl(branding.primaryColor);
            if (hsl) {
                root.style.setProperty('--primary', hsl);
                root.style.setProperty('--org-primary', branding.primaryColor);
            }
        }

        // Apply accent color
        if (branding?.accentColor) {
            root.style.setProperty('--org-accent', branding.accentColor);
        }

        // Set company name for dynamic titles
        if (branding?.companyName) {
            document.title = `${branding.companyName} | Dashboard`;
        }

        // Cleanup on unmount or org change
        return () => {
            root.style.removeProperty('--org-primary');
            root.style.removeProperty('--org-accent');
        };
    }, [branding]);

    return {
        logoUrl: branding?.logoUrl,
        companyName: branding?.companyName || organization?.name,
        primaryColor: branding?.primaryColor,
        accentColor: branding?.accentColor,
    };
}

/**
 * Convert hex color to HSL string (for Tailwind CSS variables)
 */
function hexToHsl(hex: string): string | null {
    try {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return null;

        let r = parseInt(result[1], 16) / 255;
        let g = parseInt(result[2], 16) / 255;
        let b = parseInt(result[3], 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;

        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    } catch {
        return null;
    }
}
