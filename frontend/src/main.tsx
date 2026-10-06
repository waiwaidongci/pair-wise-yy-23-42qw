import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { routes, defaultRoute } from "./router/routes";
import { initLedger } from "./db/ledgerInit";
import { preemptiveCacheCleanup } from "./services/CacheService";
import { recoverLedger } from "./services/PracticeLedgerService";
import { StatusBadge } from "./components/common/StatusBadge";
import "./styles.css";

function currentRoute(): string {
  const hash = window.location.hash.replace(/^#/, "");
  return routes.some((r) => r.route === hash) ? hash : defaultRoute;
}

function useHashRoute(): string {
  const [route, setRoute] = useState<string>(currentRoute());
  useEffect(() => {
    const onChange = () => setRoute(currentRoute());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

function Shell() {
  const route = useHashRoute();
  const current = routes.find((r) => r.route === route) ?? routes[0];
  const Page = current.element;
  return (
    <div className="shell">
      <aside>
        <div className="brand">盲文点字学习训练器</div>
        <nav>
          {routes.map((r) => (
            <a
              key={r.route}
              href={`#${r.route}`}
              className={route === r.route ? "active" : ""}
            >
              {r.name}
            </a>
          ))}
        </nav>
        <div className="aside-foot">
          <StatusBadge value="LOCAL_DATA" />
          <p>IndexedDB 可恢复账本</p>
        </div>
      </aside>
      <Page />
    </div>
  );
}

function BootScreen({ stage }: { stage: string }) {
  return (
    <div className="boot">
      <div className="brand">盲文点字学习训练器</div>
      <p>{stage}</p>
    </div>
  );
}

function App() {
  return <Shell />;
}

/**
 * 启动顺序（可恢复账本的关键）：
 * 1. 初始化账本 + 首次播种
 * 2. 空间紧张先清可重建缓存
 * 3. 恢复扫描：补齐或撤掉未结算记录、半截会话失效重排
 * 4. 渲染界面
 */
async function bootstrap(): Promise<void> {
  await initLedger();
  await preemptiveCacheCleanup().catch(() => false);
  await recoverLedger().catch(() => undefined);
}

const root = document.getElementById("root");
if (root) {
  // 先挂一个启动屏，恢复完成后再挂应用
  root.innerHTML = "";
  const boot = document.createElement("div");
  boot.textContent = "正在恢复账本…";
  boot.className = "boot-text";
  root.appendChild(boot);
  bootstrap()
    .then(() => {
      createRoot(root).render(<App />);
    })
    .catch((error) => {
      boot.textContent = `账本初始化失败：${error instanceof Error ? error.message : String(error)}`;
    });
}
