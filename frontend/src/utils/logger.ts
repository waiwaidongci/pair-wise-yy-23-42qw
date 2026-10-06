/**
 * 轻量日志封装。所有写操作都记录日志，日志模板来自 constants/logTemplates。
 */
import { LOG_TEMPLATES } from "../constants/logTemplates";

type LogDomain = keyof typeof LOG_TEMPLATES;

export function logWrite(domain: LogDomain, templateIndex: number, detail?: Record<string, unknown>): void {
  const templates = LOG_TEMPLATES[domain];
  const template = templates[templateIndex] ?? templates[0];
  const entry = {
    ts: new Date().toISOString(),
    domain,
    action: template,
    ...detail
  };
  // 结构化输出，便于排查；不吞异常
  console.info(`[ledger:${domain}] ${template}`, entry);
}

export function logError(domain: LogDomain, templateIndex: number, err: unknown, detail?: Record<string, unknown>): void {
  const templates = LOG_TEMPLATES[domain];
  const template = templates[templateIndex] ?? templates[0];
  console.error(`[ledger:${domain}] ${template}`, { err, ...detail });
}
