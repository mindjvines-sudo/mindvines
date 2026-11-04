"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";

import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

type RevealProps = {
  children: React.ReactNode;
  /** Seconds of delay — used to stagger siblings by hand where needed. */
  delay?: number;
  /** Travel distance in px. `0` gives a pure fade. */
  y?: number;
  className?: string;
  as?: "div" | "li" | "section" | "article" | "span";
};

/**
 * Scroll-triggered entrance. Fires once, and collapses to a plain fade when
 * the visitor prefers reduced motion.
 */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  as = "div",
}: RevealProps) {
  const reduceMotion = useReducedMotion();
  const MotionTag = motion[as];

  return (
    <MotionTag
      className={className}
      data-reveal
      initial={{ opacity: 0, y: reduceMotion ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: reduceMotion ? 0.2 : 0.7, delay, ease: EASE }}
    >
      {children}
    </MotionTag>
  );
}

const groupVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

type StaggerGroupProps = {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "ul";
};

/** Parent for `StaggerItem` children — reveals them in sequence. */
export function StaggerGroup({
  children,
  className,
  as = "div",
}: StaggerGroupProps) {
  const MotionTag = motion[as];

  return (
    <MotionTag
      className={className}
      variants={groupVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
    >
      {children}
    </MotionTag>
  );
}

type StaggerItemProps = {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "li" | "article";
};

export function StaggerItem({
  children,
  className,
  as = "div",
}: StaggerItemProps) {
  const reduceMotion = useReducedMotion();
  const MotionTag = motion[as];

  return (
    <MotionTag
      className={cn(className)}
      data-reveal
      variants={{
        hidden: { opacity: 0, y: reduceMotion ? 0 : 32 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: reduceMotion ? 0.2 : 0.65, ease: EASE },
        },
      }}
    >
      {children}
    </MotionTag>
  );
}
