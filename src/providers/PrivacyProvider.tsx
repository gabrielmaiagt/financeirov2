'use client';

import { createContext, useContext, useState, ReactNode, useMemo } from 'react';

type PrivacyContextType = {
  isBlurred: boolean;
  toggleBlur: () => void;
};

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [isBlurred, setIsBlurred] = useState(false);

  const toggleBlur = () => {
    setIsBlurred((prev) => !prev);
  };
  
  const value = useMemo(() => ({ isBlurred, toggleBlur }), [isBlurred]);

  return (
    <PrivacyContext.Provider value={value}>
      <div className={isBlurred ? 'data-blurred' : ''}>
        {children}
      </div>
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (context === undefined) {
    throw new Error('usePrivacy must be used within a PrivacyProvider');
  }
  return context;
}
