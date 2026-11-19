import { describe, expect, it } from "vitest";
import { createValidationReport, runValidationLogReport } from "../../scripts/validation-log-report.mjs";

describe("validation log fixture and report command", () => {
  it("creates a validation report from a fixture log", () => {
    const report = createValidationReport({
      filePath: "test/fixtures/validation-log/sample-renderer.log"
    });

    expect(report.logPath).toMatch(/sample-renderer\.log$/);
    expect(report.summary.totalEvents).toBe(3);
    expect(report.summary.lastEvent?.eventName).toBe("history_flush_result");
  });

  it("runs the report command in text mode", () => {
    const writes: string[] = [];
    const result = runValidationLogReport([
      "--file",
      "test/fixtures/validation-log/sample-renderer.log"
    ], {
      write: (value: string) => {
        writes.push(value);
      }
    });

    expect(result.summary.totalEvents).toBe(3);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain("Total events: 3");
  });

  it("runs the report command in json mode", () => {
    const writes: string[] = [];
    runValidationLogReport([
      "--json",
      "--file",
      "test/fixtures/validation-log/sample-renderer.log"
    ], {
      write: (value: string) => {
        writes.push(value);
      }
    });

    expect(writes).toHaveLength(1);
    expect(JSON.parse(writes[0])).toMatchObject({
      totalEvents: 3,
      countsByEvent: {
        display_guard_enable: 1,
        resume_attempt: 1,
        history_flush_result: 1
      }
    });
  });
});
