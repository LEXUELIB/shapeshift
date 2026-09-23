"use client";

import { useEffect, useRef } from "react";
import { tx } from "@/lib/i18n";

type Step = { text: string; then?: string };

/**
 * `?demo=1` types these at human speed. Chinese runs the accepted sample set
 * (see reports/zh-cn-golden-set.md) so the recording shows inputs the parsers
 * understand; English keeps the original script byte for byte.
 */
export const DEMO_SCRIPT: Step[] = [
  { text: tx("dinner with priya friday 8pm", "明天下午三点和普里亚视频会议"), then: tx(" on zoom", " 用 Zoom") },
  { text: tx("buy milk, eggs, bread and coffee", "买牛奶、鸡蛋、面包和咖啡") },
  { text: tx("25 min focus", "25分钟专注") },
  { text: tx("#ff6b35", "天蓝色") },
  { text: tx("split 2400 between 3", "2400块分3个人") },
  { text: tx("5 miles in km", "5英里等于多少公里") },
  { text: tx("flight to goa next weekend", "下周末去三亚") },
  { text: tx("pizza or burgers for friday?", "周五吃披萨还是汉堡？") },
  { text: tx("days until christmas", "12月25日还有多少天") },
  { text: tx("3pm pst in ist", "北京下午3点换成纽约时间") },
  { text: tx("roll 2d6", "掷2个骰子") },
  { text: tx("remind me to pay rent tomorrow urgent", "提醒我明天交房租") },
];

export type DemoApi = {
  getText: () => string;
  setText: (t: string) => void;
  /** Complete the current card; returns false if there's nothing to complete. */
  complete: () => boolean;
  clear: () => void;
};

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

const jitter = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

/** ?demo=1 types a scripted sequence at human speed; &loop=1 repeats it forever. */
export function useDemoScript(enabled: boolean, loop: boolean, api: DemoApi) {
  const apiRef = useRef(api);
  useEffect(() => {
    apiRef.current = api;
  });

  useEffect(() => {
    if (!enabled) return;
    const ctrl = new AbortController();
    const { signal } = ctrl;

    const type = async (s: string) => {
      let current = apiRef.current.getText();
      // A CJK character is one code point but two UTF-16 units; iterating the
      // string still types it in one step, so the pauses below stay per-glyph.
      for (const ch of s) {
        current += ch;
        apiRef.current.setText(current);
        await sleep(ch === " " ? jitter(110, 200) : jitter(45, 90), signal);
      }
    };

    (async () => {
      await sleep(900, signal);
      do {
        for (const step of DEMO_SCRIPT) {
          await type(step.text);
          if (step.then) {
            await sleep(1100, signal);
            await type(step.then);
          }
          await sleep(1400, signal);
          if (!apiRef.current.complete()) {
            await sleep(600, signal);
            if (!apiRef.current.complete()) apiRef.current.clear();
          }
          await sleep(750, signal);
        }
        if (loop) await sleep(1200, signal);
      } while (loop && !signal.aborted);
    })().catch(() => {});

    return () => ctrl.abort();
  }, [enabled, loop]);

  // Hide the cursor after 2s idle so recordings stay clean.
  useEffect(() => {
    if (!enabled) return;
    let id: ReturnType<typeof setTimeout>;
    const wake = () => {
      document.body.classList.remove("demo-idle");
      clearTimeout(id);
      id = setTimeout(() => document.body.classList.add("demo-idle"), 2000);
    };
    wake();
    window.addEventListener("mousemove", wake);
    return () => {
      clearTimeout(id);
      window.removeEventListener("mousemove", wake);
      document.body.classList.remove("demo-idle");
    };
  }, [enabled]);
}
