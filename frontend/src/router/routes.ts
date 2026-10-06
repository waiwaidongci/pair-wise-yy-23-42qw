import { LearnPage } from "../pages/LearnPage";
import { PracticePage } from "../pages/PracticePage";
import { MistakesPage } from "../pages/MistakesPage";
import { ProgressPage } from "../pages/ProgressPage";

export const routes = [
  { name: "学习卡片", route: "/learn", element: LearnPage },
  { name: "练习模式", route: "/practice", element: PracticePage },
  { name: "错题本", route: "/mistakes", element: MistakesPage },
  { name: "学习进度", route: "/progress", element: ProgressPage }
] as const;

export const defaultRoute = routes[0].route;
