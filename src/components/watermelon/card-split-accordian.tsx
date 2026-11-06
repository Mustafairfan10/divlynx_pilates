"use client";

/**
 * "Card Split Accordian" from Watermelon UI (https://ui.watermelon.sh), installed from
 * https://registry.watermelon.sh/r/card-split-accordian.json and edited for this project:
 * demo items and react-icons removed, styling rebuilt as ruled paper-form entries (square, no shadow),
 * accessible disclosure attributes added, reduced-motion respected.
 */

import { ChevronDown } from "lucide-react";
import { motion, MotionConfig, useReducedMotion, type Transition } from "motion/react";
import { useId, useState, type FC, type ReactNode } from "react";
import useMeasure from "react-use-measure";
import { cn } from "@/lib/utils";

export interface AccordionItemData {
  id: number;
  title: string;
  icon?: ReactNode;
  content: ReactNode;
}

interface AccordionItemProps {
  item: AccordionItemData;
  setOpenId: (id: number | null) => void;
  index: number;
  total: number;
  openIndex: number;
}

const spring: Transition = { type: "spring", stiffness: 600, damping: 50, mass: 1 };
const RADIUS = 0; // paper form: square, ruled entries

const AccordionItem: FC<AccordionItemProps> = ({ item, setOpenId, index, total, openIndex }) => {
  const [ref, bounds] = useMeasure();
  const panelId = useId();
  const isOpen = index === openIndex;
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const isBeforeOpen = index === openIndex - 1;
  const isAfterOpen = index === openIndex + 1;
  const isAlone = (isAfterOpen && isLast) || (isBeforeOpen && isFirst);

  const top = isFirst || isAfterOpen || isOpen ? "1px" : "0px";
  const bottom = isLast || isBeforeOpen || isOpen ? "1px" : "0px";

  let tl = 0, tr = 0, bl = 0, br = 0;
  if (isOpen || isAlone) tl = tr = bl = br = RADIUS;
  else if (isBeforeOpen) bl = br = RADIUS;
  else if (isAfterOpen) tl = tr = RADIUS;
  else if (isFirst) tl = tr = RADIUS;
  else if (isLast) bl = br = RADIUS;

  return (
    <motion.li layout>
      <motion.div
        animate={{ borderTopLeftRadius: tl, borderTopRightRadius: tr, borderBottomLeftRadius: bl, borderBottomRightRadius: br }}
        className={cn("overflow-hidden border-solid bg-transparent", isOpen ? "border-[var(--print)]" : "border-[var(--rule)]")}
        style={{ borderTopWidth: isOpen ? "1.5px" : top, borderBottomWidth: isOpen ? "1.5px" : bottom, borderLeftWidth: 0, borderRightWidth: 0, marginBlock: isOpen ? "14px" : "0px" }}
      >
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setOpenId(isOpen ? null : item.id)}
          className="flex w-full cursor-pointer items-center justify-between gap-4 px-1 py-4 text-left"
        >
          <span className="flex items-center gap-3.5">
            {item.icon && <span className="shrink-0 text-[var(--ballpoint)]">{item.icon}</span>}
            <span className="text-[17px] font-semibold text-[var(--print)] md:text-lg">{item.title}</span>
          </span>
          <motion.span animate={{ rotate: isOpen ? 180 : 0 }} className="shrink-0 text-[var(--form)]">
            <ChevronDown className="size-5" />
          </motion.span>
        </button>
        <motion.div
          id={panelId}
          role="region"
          initial={false}
          animate={{ height: isOpen ? bounds.height : 0, opacity: isOpen ? 1 : 0 }}
          className="overflow-hidden"
        >
          <div ref={ref}>
            <div className="px-1 pb-5 text-[16px] leading-relaxed text-[var(--print-2)]">{item.content}</div>
          </div>
        </motion.div>
      </motion.div>
    </motion.li>
  );
};

export const AccordionApp: FC<{ items: AccordionItemData[]; className?: string; defaultOpen?: number }> = ({ items, className, defaultOpen }) => {
  const [openId, setOpenId] = useState<number | null>(defaultOpen ?? null);
  const reduce = useReducedMotion();
  const openIndex = items.findIndex((item) => item.id === openId);
  return (
    <MotionConfig transition={reduce ? { duration: 0 } : spring}>
      <ul className={cn("w-full", className)}>
        {items.map((item, index) => (
          <AccordionItem key={item.id} item={item} setOpenId={setOpenId} index={index} total={items.length} openIndex={openIndex} />
        ))}
      </ul>
    </MotionConfig>
  );
};
