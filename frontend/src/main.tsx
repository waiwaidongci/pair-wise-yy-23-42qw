import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { routes } from "./router/routes";
import { seedLedgerIfEmpty } from "./utils/seedLedger";
import { useLedgerRecovery } from "./hooks/useLedgerRecovery";
import { StatusBadge } from "./components/common/StatusBadge";
import { LearnPage } from "./pages/LearnPage";
import { PracticePage } from "./pages/PracticePage";
import { MistakesPage } from "./pages/MistakesPage";
import { ProgressPage } from "./pages/ProgressPage";
import "./styles.css";

function Page({ route }: { route: string }) {
  switch (route) {
    case "/learn":
      return <LearnPage />;
    case "/practice":
      return <PracticePage />;
    case "/mistakes":
      return <MistakesPage />;
    case "/progress":
      return <ProgressPage />;
    default:
      return <LearnPage />;
  }
}

function App() {
  const [active, setActive] = useState<string>(routes[0]?.route ?? "/learn");
  const [ready, setReady] = useState(false);
  const { recovering } = useLedgerRecovery();

  useEffect(() => {
    let mounted = true;
    void (async () => {
      await seedLedgerIfEmpty();
      if (mounted) setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const current = routes.find((route) => route.route === active) ?? routes[0];

  return (
    <div className="shell">
      <aside>
        <div className="brand">盲文点字学习训练器</div>
        <nav>
          {routes.map((route) => (
            <button
              key={route.route}
              className={active === route.route ? "active" : ""}
              onClick={() => setActive(route.route)}
            >
              {route.name}
            </button>
          ))}
        </nav>
      </aside>
      <main className="page">
        {!ready || recovering ? (
          <section className="page-head">
            <div>
              <p className="eyebrow">braille-trainer</p>
              <h1>正在恢复账本…</h1>
            </div>
            <StatusBadge value="恢复中" />
          </section>
        ) : (
          <Page route={current?.route ?? "/learn"} />
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
