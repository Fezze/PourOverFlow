const statusElement = document.querySelector("#status");
const watchFace = document.querySelector("#watch-face");

window.__POF_WATCH_PREVIEW_READY__ = false;

bootstrap().catch((error) => {
  statusElement.textContent = error instanceof Error ? error.message : String(error);
  window.__POF_WATCH_PREVIEW_READY__ = false;
});

async function bootstrap() {
  const params = new URLSearchParams(window.location.search);
  const scenario = params.get("scenario");

  if (!scenario) {
    throw new Error("Missing ?scenario=<name> query parameter.");
  }

  const response = await fetch(`/output/playwright/watch-preview/fixtures/${encodeURIComponent(scenario)}.json`);
  if (!response.ok) {
    throw new Error(`Could not load preview fixture for ${scenario}.`);
  }

  const preview = await response.json();
  document.documentElement.lang = preview.locale || "en";
  statusElement.textContent = `${preview.scenario} • ${preview.locale}`;
  renderWidgets(preview.widgets || []);
  window.__POF_WATCH_PREVIEW_READY__ = true;
}

function renderWidgets(widgets) {
  watchFace.replaceChildren();

  widgets.forEach((widget) => {
    const element = createWidgetElement(widget);
    if (element) {
      watchFace.appendChild(element);
    }
  });
}

function createWidgetElement(widget) {
  if (!widget || !widget.type) {
    return null;
  }

  if (widget.type === "FILL_RECT") {
    return createFillRect(widget);
  }

  if (widget.type === "TEXT") {
    return createText(widget);
  }

  if (widget.type === "BUTTON") {
    return createButton(widget);
  }

  if (widget.type === "SCROLL_LIST") {
    return createScrollList(widget);
  }

  return null;
}

function createFillRect(widget) {
  const element = document.createElement("div");
  element.className = "widget fill-rect";
  applyBounds(element, widget);
  element.style.setProperty("--widget-color", toColor(widget.color, "var(--watch-surface)"));
  element.style.setProperty("--widget-radius", `${Number(widget.radius || 0)}px`);
  return element;
}

function createText(widget) {
  const element = document.createElement("div");
  element.className = "widget text";
  applyBounds(element, widget);
  element.textContent = String(widget.text || "");
  element.style.fontSize = `${Number(widget.text_size || 16)}px`;
  element.style.setProperty("--widget-color", toColor(widget.color, "var(--watch-text)"));
  element.style.justifyContent = toHorizontalAlign(widget.align_h);
  element.style.alignItems = toVerticalAlign(widget.align_v);
  element.style.whiteSpace = widget.text_style === "WRAP" ? "pre-wrap" : "pre-line";
  return element;
}

function createButton(widget) {
  const element = document.createElement("div");
  element.className = "widget button";
  applyBounds(element, widget);
  element.textContent = String(widget.text || "");
  element.style.fontSize = `${Math.max(16, Math.floor(Number(widget.h || 48) / 2.8))}px`;
  return element;
}

function createScrollList(widget) {
  const element = document.createElement("div");
  element.className = "widget scroll-list";
  applyBounds(element, widget);

  const itemHeight = Number(widget.item_config?.[0]?.item_height || 72);
  const itemSpace = Number(widget.item_space || 0);
  const itemRadius = Number(widget.item_config?.[0]?.item_bg_radius || 18);
  const rows = Array.isArray(widget.data_array) ? widget.data_array : [];

  rows.forEach((row, index) => {
    const card = document.createElement("div");
    const hasIcon = Boolean(row?.icon);
    card.className = `scroll-card${hasIcon ? " with-icon" : ""}`;
    card.style.top = `${index * (itemHeight + itemSpace)}px`;
    card.style.height = `${itemHeight}px`;
    card.style.setProperty("--card-radius", `${itemRadius}px`);

    if (hasIcon) {
      const icon = document.createElement("div");
      icon.className = "icon-chip";
      icon.textContent = buildIconLabel(row.icon);
      card.appendChild(icon);
    }

    const textWrap = document.createElement("div");
    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = row?.title || "";
    textWrap.appendChild(title);

    if (row?.meta) {
      const meta = document.createElement("div");
      meta.className = "card-meta";
      meta.textContent = row.meta;
      textWrap.appendChild(meta);
    }

    card.appendChild(textWrap);
    element.appendChild(card);
  });

  return element;
}

function applyBounds(element, widget) {
  element.style.left = `${Number(widget.x || 0)}px`;
  element.style.top = `${Number(widget.y || 0)}px`;
  element.style.width = `${Number(widget.w || 0)}px`;
  element.style.height = `${Number(widget.h || 0)}px`;
}

function toColor(value, fallback) {
  if (typeof value !== "number") {
    return fallback;
  }

  return `#${value.toString(16).padStart(6, "0")}`;
}

function toHorizontalAlign(value) {
  if (value === "RIGHT") {
    return "flex-end";
  }

  if (value === "CENTER_H") {
    return "center";
  }

  return "flex-start";
}

function toVerticalAlign(value) {
  if (value === "TOP") {
    return "flex-start";
  }

  if (value === "CENTER_V") {
    return "center";
  }

  return "flex-start";
}

function buildIconLabel(iconName) {
  return String(iconName || "")
    .replace(/\.png$/i, "")
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0])
    .join("")
    .toUpperCase();
}