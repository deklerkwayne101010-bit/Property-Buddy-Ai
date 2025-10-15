// Animation utilities and components for smooth transitions
import { easeOut, easeInOut, anticipate } from "framer-motion";

export const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: easeOut }
};

export const fadeInLeft = {
  initial: { opacity: 0, x: -16 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.4, ease: easeOut }
};

export const fadeInRight = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.4, ease: easeOut }
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.3, ease: easeOut }
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const staggerItem = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: easeOut }
};

// Loading spinner animation
export const spin = {
  animate: { rotate: 360 },
  transition: { duration: 1, repeat: Infinity }
};

// Pulse animation for loading states
export const pulse = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1]
  },
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: easeInOut
  }
};

// Bounce animation for success states
export const bounce = {
  animate: {
    y: [0, -10, 0],
    scale: [1, 1.1, 1]
  },
  transition: {
    duration: 0.6,
    ease: easeOut
  }
};

// Hover effects
export const hoverLift = {
  whileHover: { y: -2, scale: 1.01 },
  whileTap: { scale: 0.99 },
  transition: { duration: 0.15 }
};

export const hoverGlow = {
  whileHover: {
    boxShadow: "0 10px 25px rgba(59, 130, 246, 0.3)",
    scale: 1.02
  },
  transition: { duration: 0.2 }
};

// Page transition variants
export const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 }
};

export const pageTransition = {
  type: "tween" as const,
  ease: anticipate,
  duration: 0.5
};

// Performance optimizations
export const reducedMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.2 }
};

// Check for reduced motion preference
export const useReducedMotion = () => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
};

// Optimized animation variants with performance considerations
export const optimizedVariants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.15, ease: easeOut }
  },
  slideIn: {
    initial: { opacity: 0, x: -8 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.2, ease: easeOut }
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.15, ease: easeOut }
  },
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.05
      }
    }
  },
  staggerItem: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.2, ease: easeOut }
  }
};

// Performance-optimized animation variants
export const performanceVariants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.2 }
  },
  slideIn: {
    initial: { opacity: 0, x: -10 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.3 }
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.2 }
  }
};