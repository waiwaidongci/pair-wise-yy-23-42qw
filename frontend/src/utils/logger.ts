import { LOG_TEMPLATES, type LogEntity } from "../constants/logTemplates";

/**
 * 唯一日志出口：所有 service 写操作都走这里。
 * 模板集中在 constants/logTemplates，字段变更需同步模板与调用处。
 */
export function log<E extends LogEntity>(entity: E, templateIndex: number, vars: Record<string, string | number | undefined> = {}) {
  const templates = LOG_TEMPLATES[entity];
  const template = templates[templateIndex] ?? templates[0];
  const message = template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
  console.info(`[${entity}] ${message}`);
  return message;
}

export const logTemplateCount = (entity: LogEntity) => LOG_TEMPLATES[entity].length;
