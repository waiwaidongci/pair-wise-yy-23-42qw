/**
 * 零依赖迷你测试框架（供 scripts/*.test.ts 使用）
 */
type Fn = () => void | Promise<void>;

interface TestCase {
  name: string;
  fn: Fn;
}

const cases: TestCase[] = [];
const beforeAllFns: Fn[] = [];
const beforeEachFns: Fn[] = [];
let currentCase: string | null = null;

export function test(name: string, fn: Fn): void {
  cases.push({ name, fn });
}

export function beforeAll(fn: Fn): void {
  beforeAllFns.push(fn);
}

export function beforeEach(fn: Fn): void {
  beforeEachFns.push(fn);
}

export function expect<T>(actual: T) {
  const prefix = currentCase ? `[${currentCase}] ` : "";
  const api = {
    toBe(expected: unknown) {
      if (actual !== expected) {
        throw new Error(`${prefix}期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected: unknown) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${prefix}深度相等失败：期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy() {
      if (!actual) throw new Error(`${prefix}期望真值，实际 ${JSON.stringify(actual)}`);
    },
    toBeNull() {
      if (actual !== null) throw new Error(`${prefix}期望 null，实际 ${JSON.stringify(actual)}`);
    },
    toContain(expected: unknown) {
      const arr = actual as unknown as unknown[];
      if (!arr.includes(expected)) throw new Error(`${prefix}期望包含 ${JSON.stringify(expected)}`);
    }
  };
  return {
    ...api,
    not: {
      toBe(expected: unknown) {
        if (actual === expected) {
          throw new Error(`${prefix}期望不等于 ${JSON.stringify(expected)}`);
        }
      },
      toBeNull() {
        if (actual === null) throw new Error(`${prefix}期望非 null`);
      }
    }
  };
}

export async function run(): Promise<void> {
  let failed = 0;
  for (const fn of beforeAllFns) await fn();
  for (const c of cases) {
    currentCase = c.name;
    try {
      for (const fn of beforeEachFns) await fn();
      await c.fn();
      console.log(`  ✓ ${c.name}`);
    } catch (error) {
      failed += 1;
      console.error(`  ✗ ${c.name}`);
      console.error(`    ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      currentCase = null;
    }
  }
  console.log(`\n${cases.length - failed}/${cases.length} 通过`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}
