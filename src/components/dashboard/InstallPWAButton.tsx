'use client';

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface InstallPWAButtonProps {
    isVisible: boolean;
    handleInstall: () => void;
}

export const InstallPWAButton = ({ isVisible, handleInstall }: InstallPWAButtonProps) => {
    if (!isVisible) {
        return null;
    }

    return (
        <Button onClick={handleInstall} variant="ghost" size="icon" title="Instalar Aplicativo">
            <Download className="h-5 w-5" />
        </Button>
    );
};
