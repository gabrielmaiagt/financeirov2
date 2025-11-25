'use client';
import { useEffect, useState } from 'react';
import ReactConfetti from 'react-confetti';

interface ConfettiProps {
    onComplete: () => void;
}

const Confetti = ({ onComplete }: ConfettiProps) => {
    const [windowSize, setWindowSize] = useState<{width: number, height: number}>({width: 0, height: 0});

    useEffect(() => {
        // Handler to call on window resize
        function handleResize() {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        }
        
        window.addEventListener("resize", handleResize);
        
        // Call handler right away so state gets updated with initial window size
        handleResize();
        
        // Remove event listener on cleanup
        return () => window.removeEventListener("resize", handleResize);
    }, []); 
    

    if(windowSize.width === 0) return null;

  return (
    <ReactConfetti
        width={windowSize.width}
        height={windowSize.height}
        recycle={false}
        numberOfPieces={400}
        gravity={0.15}
        onConfettiComplete={onComplete}
        className="fixed top-0 left-0 w-full h-full z-50"
    />
  );
};

export default Confetti;
