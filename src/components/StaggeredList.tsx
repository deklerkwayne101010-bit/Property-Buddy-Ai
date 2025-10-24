'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { staggerContainer, staggerItem } from './animations';

interface StaggeredListProps {
  children: ReactNode[];
  className?: string;
  delay?: number;
}

export default function StaggeredList({ children, className = '', delay = 0 }: StaggeredListProps) {
  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      style={{ animationDelay: `${delay}s` }}
    >
      {children.map((child, index) => (
        <motion.div key={index} variants={staggerItem}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}