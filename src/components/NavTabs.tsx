"use client";
import { useUI } from "@/components/ThemeProvider";
import { Tabs } from "@/components/ui/tabs";

export const NavTabs = ({
    defaultValue,
    className,
    children
}: {
    defaultValue: string;
    className?: string;
    children: React.ReactNode
}) => {
    const { settings } = useUI();

    // If layout is NOT tabs, we still need the Tabs context for content to work,
    // but we might hide the list or style it differently.
    // Actually, the existing page structure relies on <Tabs> wrapping everything.
    // So we always render Tabs, but we might hide the TabsList inside it via CSS or conditional rendering
    // if we are in sidebar/topbar mode.
    // However, the cleanest way is to let the page render Tabs as usual, 
    // but we control the visibility of the *default* TabsList in the page.

    // Wait, the page.tsx has <TabsList> explicitly. 
    // We need to replace the <Tabs> in page.tsx with this component?
    // Or rather, this component should wrap the content and provide the Tabs context.

    // Let's make this component a wrapper that handles the layout logic.
    // If layout is 'sidebar' or 'topbar', we still need the Tabs context because 
    // the content is inside <TabsContent>.

    return (
        <Tabs defaultValue={defaultValue} className={className}>
            {children}
        </Tabs>
    );
};
