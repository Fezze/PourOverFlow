import { pathToFileURL } from "node:url";

export function isCliEntry(moduleUrl, entryPath = process.argv[1]) {
  return Boolean(entryPath) && pathToFileURL(entryPath).href === moduleUrl;
}
