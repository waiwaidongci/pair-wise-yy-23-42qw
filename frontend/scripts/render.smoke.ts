/**
 * SSR 渲染冒烟：jsdom 全局环境 + fake-indexeddb，
 * 用 Vite 以 SSR 方式加载真实页面模块并 renderToString，
 * 验证四个路由页面都能在账本已初始化的环境下渲染（无导入/渲染期崩溃）。
 * 运行：npx tsx scripts/render.smoke.ts
 */
import { JSDOM } from "jsdom";
import "fake-indexeddb/auto";
import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import React from "react";

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost:20111/#/practice" });
(globalThis as { window: unknown }).window = dom.window;
(globalThis as { document: unknown }).document = dom.window.document;
(globalThis as { navigator: unknown }).navigator = dom.window.navigator;
(globalThis as { HTMLElement: unknown }).HTMLElement = dom.window.HTMLElement;
(globalThis as { Event: unknown }).Event = dom.window.Event;
(globalThis as { sessionStorage: unknown }).sessionStorage = dom.window.sessionStorage;
(globalThis as { requestAnimationFrame: unknown }).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0) as unknown as number;
(globalThis as { cancelAnimationFrame: unknown }).cancelAnimationFrame = (id: number) => clearTimeout(id);

let passed = 0;
const failures: string[] = [];

async function main() {
  const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
  try {
    const { initLedger } = await server.ssrLoadModule("/src/db/ledgerInit.ts");
    await initLedger();

    for (const [name, path] of [
      ["学习卡片", "/src/pages/LearnPage.tsx"],
      ["练习模式", "/src/pages/PracticePage.tsx"],
      ["错题本", "/src/pages/MistakesPage.tsx"],
      ["学习进度", "/src/pages/ProgressPage.tsx"]
    ] as const) {
      try {
        const mod = await server.ssrLoadModule(path);
        const Page = mod[name === "学习卡片" ? "LearnPage" : name === "练习模式" ? "PracticePage" : name === "错题本" ? "MistakesPage" : "ProgressPage"];
        const html = renderToString(React.createElement(Page));
        if (html.length < 20) throw new Error("渲染结果过短，疑似空页面");
        console.log(`  ✓ ${name} 渲染 ${html.length} 字符`);
        passed += 1;
      } catch (error) {
        failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
        console.error(`  ✗ ${name} 渲染失败：${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // 共享组件渲染
    const components: [string, string][] = [
      ["BrailleCell", "/src/components/common/BrailleCell.tsx"],
      ["LessonProgress", "/src/components/common/LessonProgress.tsx"],
      ["PracticePanel", "/src/components/common/PracticePanel.tsx"],
      ["ResultBadge", "/src/components/common/ResultBadge.tsx"],
      ["ChartPanel", "/src/components/common/ChartPanel.tsx"],
      ["StatusBadge", "/src/components/common/StatusBadge.tsx"],
      ["EmptyState", "/src/components/common/EmptyState.tsx"]
    ];
    for (const [componentName, path] of components) {
      try {
        const mod = await server.ssrLoadModule(path);
        const el = mod[componentName];
        const props =
          componentName === "BrailleCell"
            ? { pattern: "1,4" }
            : componentName === "PracticePanel"
              ? {
                  snapshot: { id: 1, cell_pattern: "1", letter: "a", pinyin: "a", category: "LETTER", difficulty: "1", audio_hint_key: "k", version: 1 },
                  mode: "CELL_TO_TEXT",
                  index: 0,
                  total: 5
                }
              : componentName === "ChartPanel"
                ? { title: "t", data: [{ label: "a", value: 1 }] }
                : componentName === "ResultBadge" || componentName === "StatusBadge"
                  ? { value: "SETTLED" }
                  : { answered: 1, total: 5 };
        const html = renderToString(React.createElement(el, props));
        if (html.length < 5) throw new Error("空渲染");
        console.log(`  ✓ 组件 ${componentName} 渲染 ${html.length} 字符`);
        passed += 1;
      } catch (error) {
        failures.push(`${componentName}: ${error instanceof Error ? error.message : String(error)}`);
        console.error(`  ✗ 组件 ${componentName}：${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } finally {
    await server.close();
  }
  console.log(`\n${passed}/${passed + failures.length} 通过`);
  if (failures.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
