'use client';

import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';

type AnimatedNumberProps = {
    value: number;
    formatter?: (value: number) => string;
    className?: string;
};

export function AnimatedNumber({ value, formatter, className }: AnimatedNumberProps) {
    const spring = useSpring(0, { mass: 1, stiffness: 50, damping: 25 });
    const display = useTransform(spring, (current) =>
        formatter ? formatter(current) : Math.round(current).toString()
    );

    useEffect(() => {
        spring.set(value);
    }, [spring, value]);

    return <motion.span className={className}>{display}</motion.span>;
}
