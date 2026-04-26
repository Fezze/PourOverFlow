import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSimulatorRoot } from "./playwright-coverage-helpers.mjs";

export const VALIDATION_LOG_PREFIX = "[pof-validation]";
export const DEFAULT_VALIDATION_LOG_FILE = "renderer.log";

function isWindowsAbsolutePath(value) {
  return typeof value === "string" && /^[A-Za-z]:[\\/]/.test(value);
}

function resolvePortablePath(targetPath) {
  return isWindowsAbsolutePath(targetPath)
    ? path.win32.resolve(targetPath)
    : path.resolve(targetPath);
}

function joinPortablePath(rootPath, ...segments) {
  return isWindowsAbsolutePath(rootPath)
    ? path.win32.join(rootPath, ...segments)
    : path.join(rootPath, ...segments);
}

export function parseValidationLogArgs(argv = []) {
  const options = {
    filePath: null,
    simulatorRoot: null,
    json: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg === "--file") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Expected a path after --file.");
      }
      options.filePath = value;
      index += 1;
      continue;
    }

    if (arg === "--simulator-root") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Expected a path after --simulator-root.");
      }
      options.simulatorRoot = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown validation-log argument: ${arg}`);
  }

  return options;
}

export function resolveValidationLogPath(options = {}, env = process.env) {
  if (options.filePath) {
    return resolvePortablePath(options.filePath);
  }

  const shouldUseWindowsSimulatorRoot =
    !options.simulatorRoot && Boolean(env.APPDATA) && !env.XDG_CONFIG_HOME && !env.HOME;
  const simulatorRoot = options.simulatorRoot
    ? resolvePortablePath(options.simulatorRoot)
    : resolveSimulatorRoot({
      env,
      platform: shouldUseWindowsSimulatorRoot ? "win32" : process.platform,
      homeDir: env.HOME || env.USERPROFILE || ""
    });

  return joinPortablePath(simulatorRoot, "logs", DEFAULT_VALIDATION_LOG_FILE);
}

export function parseValidationLogLine(line) {
  const prefixIndex = line.indexOf(VALIDATION_LOG_PREFIX);
  if (prefixIndex === -1) {
    return null;
  }

  const leadingText = line.slice(0, prefixIndex).trim();
  const payload = line.slice(prefixIndex + VALIDATION_LOG_PREFIX.length).trim();
  if (!payload) {
    return null;
  }

  const firstSpace = payload.indexOf(" ");
  const eventName = firstSpace === -1 ? payload : payload.slice(0, firstSpace);
  const detailsText = firstSpace === -1 ? "" : payload.slice(firstSpace + 1).trim();

  return {
    rawLine: line,
    timestampText: leadingText || null,
    eventName,
    detailsText,
    details: parseValidationDetails(detailsText)
  };
}

export function parseValidationDetails(detailsText) {
  if (!detailsText) {
    return null;
  }

  try {
    return JSON.parse(detailsText);
  } catch {
    return detailsText;
  }
}

export function parseValidationLogContents(contents) {
  return String(contents)
    .split(/\r?\n/)
    .map((line) => parseValidationLogLine(line))
    .filter(Boolean);
}

export function buildValidationSummary(entries = []) {
  const countsByEvent = {};
  for (const entry of entries) {
    countsByEvent[entry.eventName] = (countsByEvent[entry.eventName] || 0) + 1;
  }

  return {
    totalEvents: entries.length,
    countsByEvent,
    lastEvent: entries.length > 0 ? entries[entries.length - 1] : null
  };
}

export function formatValidationSummary(summary, logPath) {
  const lines = [`Validation log report: ${logPath}`];

  if (summary.totalEvents === 0) {
    lines.push("No [pof-validation] events found.");
    return lines.join("\n");
  }

  lines.push(`Total events: ${summary.totalEvents}`);
  lines.push("Event counts:");

  for (const eventName of Object.keys(summary.countsByEvent).sort()) {
    lines.push(`- ${eventName}: ${summary.countsByEvent[eventName]}`);
  }

  if (summary.lastEvent) {
    lines.push("Last event:");
    lines.push(`- event: ${summary.lastEvent.eventName}`);
    if (summary.lastEvent.timestampText) {
      lines.push(`- timestamp: ${summary.lastEvent.timestampText}`);
    }
    if (summary.lastEvent.detailsText) {
      lines.push(`- details: ${summary.lastEvent.detailsText}`);
    }
  }

  return lines.join("\n");
}

export function readValidationLog(logPath) {
  return fs.readFileSync(logPath, "utf8");
}

export function createValidationReport(options = {}, env = process.env) {
  const logPath = resolveValidationLogPath(options, env);
  const contents = readValidationLog(logPath);
  const entries = parseValidationLogContents(contents);
  const summary = buildValidationSummary(entries);

  return {
    logPath,
    summary
  };
}

export function runValidationLogReport(argv = [], {
  env = process.env,
  write = console.log
} = {}) {
  const options = parseValidationLogArgs(argv);
  const { logPath, summary } = createValidationReport(options, env);

  if (options.json) {
    write(JSON.stringify({
      logPath,
      ...summary
    }, null, 2));
    return {
      options,
      logPath,
      summary
    };
  }

  write(formatValidationSummary(summary, logPath));
  return {
    options,
    logPath,
    summary
  };
}

function isMainModule() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  runValidationLogReport(process.argv.slice(2));
}
