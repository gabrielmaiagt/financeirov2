'use client';

import { usePrivacy } from '@/providers/PrivacyProvider';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

export const PrivacyToggleButton = () => {
  const { isBlurred, toggleBlur } = usePrivacy();

  return (
    <Button onClick={toggleBlur} variant="ghost" size="icon" title={isBlurred ? 'Mostrar dados' : 'Ocultar dados'}>
      {isBlurred ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
    </Button>
  );
};
