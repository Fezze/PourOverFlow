import { describe, expect, it } from "vitest";

import {
  buildValidationSummary,
  createValidationReport,
  formatValidationSummary,
  parseValidationDetails,
  parseValidationLogArgs,
  parseValidationLogContents,
  parseValidationLogLine,
  resolveValidationLogPath
  ,
  runValidationLogReport
} from "../scripts/validation-log-report.mjs";

describe("validation-log-report", () => {
  it("parses explicit CLI args for log reporting", () => {
    expect(parseValidationLogArgs(["--json", "--file", "logs/custom.log"])).toEqual({
      filePath: "logs/custom.log",
      simulatorRoot: null,
      json: true
    });

    expect(parseValidationLogArgs(["--simulator-root", "tmp/simulator"])).toEqual({
      filePath: null,
      simulatorRoot: "tmp/simulator",
      json: false
    });
  });

  it("rejects unknown CLI args", () => {
    expect(() => parseValidationLogArgs(["--nope"])).toThrow("Unknown validation-log argument");
    expect(() => parseValidationLogArgs(["--file"])).toThrow("Expected a path after --file.");
    expect(() => parseValidationLogArgs(["--simulator-root"])).toThrow("Expected a path after --simulator-root.");
  });

  it("resolves an explicit file path before simulator-root logic", () => {
    expect(resolveValidationLogPath({
      filePath: "logs/renderer.log",
      simulatorRoot: "ignored"
    })).toMatch(/logs[\\/]renderer\.log$/);
  });

  it("resolves the default simulator renderer log path", () => {
    const logPath = resolveValidationLogPath({}, {
      APPDATA: "C:\\Users\\krzys\\AppData\\Roaming"
    });

    expect(logPath).toBe("C:\\Users\\krzys\\AppData\\Roaming\\simulator\\logs\\renderer.log");
  });

  it("parses validation lines with JSON details", () => {
    const entry = parseValidationLogLine(
      "2026-03-28 10:21:00 [pof-validation] display_guard_enable {\"wake\":true,\"bright\":600}"
    );

    expect(entry).toMatchObject({
      timestampText: "2026-03-28 10:21:00",
      eventName: "display_guard_enable",
      detailsText: "{\"wake\":true,\"bright\":600}",
      details: {
        wake: true,
        bright: 600
      }
    });
  });

  it("parses validation lines with non-JSON details as raw text", () => {
    const entry = parseValidationLogLine("[pof-validation] haptic_status unsupported");

    expect(entry).toMatchObject({
      timestampText: null,
      eventName: "haptic_status",
      detailsText: "unsupported",
      details: "unsupported"
    });
  });

  it("returns null for non-validation lines", () => {
    expect(parseValidationLogLine("plain renderer output")).toBeNull();
    expect(parseValidationLogLine("[pof-validation]")).toBeNull();
  });

  it("parses multi-line log contents and builds a summary", () => {
    const entries = parseValidationLogContents(`
2026-03-28 10:21:00 [pof-validation] display_guard_enable {"wake":true}
2026-03-28 10:21:05 [pof-validation] resume_attempt {"sessionId":"sess_1"}
2026-03-28 10:21:08 [pof-validation] resume_success {"sessionId":"sess_1"}
noise
2026-03-28 10:21:12 [pof-validation] history_flush_result {"sent":1,"remaining":0}
`);
    const summary = buildValidationSummary(entries);

    expect(entries).toHaveLength(4);
    expect(summary).toMatchObject({
      totalEvents: 4,
      countsByEvent: {
        display_guard_enable: 1,
        resume_attempt: 1,
        resume_success: 1,
        history_flush_result: 1
      }
    });
    expect(summary.lastEvent?.eventName).toBe("history_flush_result");
  });

  it("formats a readable text summary", () => {
    const summary = buildValidationSummary(parseValidationLogContents(`
2026-03-28 10:21:00 [pof-validation] display_guard_enable {"wake":true}
2026-03-28 10:21:12 [pof-validation] history_flush_result {"sent":1,"remaining":0}
`));
    const output = formatValidationSummary(summary, "logs/renderer.log");

    expect(output).toContain("Validation log report: logs/renderer.log");
    expect(output).toContain("Total events: 2");
    expect(output).toContain("- display_guard_enable: 1");
    expect(output).toContain("- history_flush_result: 1");
    expect(output).toContain("- event: history_flush_result");
  });

  it("formats an empty summary cleanly", () => {
    expect(formatValidationSummary(buildValidationSummary([]), "logs/renderer.log")).toContain(
      "No [pof-validation] events found."
    );
  });

  it("formats the last event cleanly when timestamp or details are absent", () => {
    const output = formatValidationSummary(buildValidationSummary([
      {
        rawLine: "[pof-validation] resume_success",
        timestampText: null,
        eventName: "resume_success",
        detailsText: "",
        details: null
      }
    ]), "logs/renderer.log");

    expect(output).toContain("- event: resume_success");
    expect(output).not.toContain("- timestamp:");
    expect(output).not.toContain("- details:");
  });

  it("parses JSON details directly when possible", () => {
    expect(parseValidationDetails("{\"queued\":2}")).toEqual({ queued: 2 });
    expect(parseValidationDetails("not-json")).toBe("not-json");
    expect(parseValidationDetails("")).toBeNull();
  });

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
