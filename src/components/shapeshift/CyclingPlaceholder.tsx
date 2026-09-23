"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { tween } from "@/lib/motion";
import { tx } from "@/lib/i18n";

/**
 * The 12 placeholder examples, in the same order as the card gallery. Chinese
 * inputs come from the accepted sample set so every rotating line is one the
 * parsers actually understand.
 */
const EXAMPLES = [
  tx("dinner with priya friday 8pm", "明天下午三点和普里亚视频会议"),
  tx("buy milk, eggs, bread and coffee", "买牛奶、鸡蛋、面包和咖啡"),
  tx("25 min focus", "25分钟专注"),
  tx("a warm sunset orange", "暖阳橙色"),
  tx("split 2400 between 3", "2400块分3个人"),
  tx("5 miles in km", "5英里等于多少公里"),
  tx("flight to goa next weekend", "下周末去三亚"),
  tx("pizza or burgers for friday?", "周五吃披萨还是汉堡？"),
  tx("days until christmas", "12月25日还有多少天"),
  tx("3pm pst in ist", "北京下午3点换成纽约时间"),
  tx("roll 2d6", "掷2个骰子"),
  tx("minecraft diamond", "天蓝色"),
];

export function CyclingPlaceholder() {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    // Auto-rotating text is autoplay: reduced motion keeps the first example still.
    if (reduce) return;
    const id = setInterval(() => setI((n) => (n + 1) % EXAMPLES.length), 2800);
    return () => clearInterval(id);
  }, [reduce]);
  return (
    <span aria-hidden className="pointer-events-none absolute inset-y-0 start-5 end-5 flex items-center overflow-hidden">
      <AnimatePresence initial={false}>
        <motion.span
          key={i}
          className="absolute truncate text-[22px] leading-8 font-[450] tracking-[-0.01em] text-muted-foreground"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(4px)" }}
          transition={reduce ? tween.fade : tween.crossfade}
        >
          {EXAMPLES[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
