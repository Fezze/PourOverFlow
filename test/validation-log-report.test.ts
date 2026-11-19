import fs from "node:fs";
import { describe, expect, it, vi } from "vitest";

import {
  buildValidationSummary,
  formatValidationSummary,
  parseValidationDetails,
  parseValidationLogArgs,
  parseValidationLogContents,
  parseValidationLogLine,
  resolveValidationLogPath,
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

  it("generates text and JSON reports from the same isolated end-to-end log input", () => {
    const read = vi.spyOn(fs, "readFileSync").mockReturnValue([
      "noise",
      "2026-05-02 09:00:00 [pof-validation] resume_success",
      "[pof-validation] resume_success",
      "[pof-validation] history_flush_result {\"sent\":1}"
    ].join("\n"));
    const write = vi.fn();
    try {
      runValidationLogReport(["--file", "fixture.log"], { write });
      expect(write).toHaveBeenLastCalledWith(expect.stringContaining("- resume_success: 2"));
      runValidationLogReport(["--file", "fixture.log", "--json"], { write });
      expect(JSON.parse(write.mock.calls.at(-1)![0])).toMatchObject({
        totalEvents: 3,
        countsByEvent: { resume_success: 2, history_flush_result: 1 },
        lastEvent: { eventName: "history_flush_result", details: { sent: 1 } }
      });
    } finally {
      read.mockRestore();
    }
  });
});
