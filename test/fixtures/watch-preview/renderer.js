const statusElement = document.querySelector("#status");
const watchShell = document.querySelector("#watch-shell");
const watchFace = document.querySelector("#watch-face");

window.__POF_WATCH_PREVIEW_READY__ = false;

bootstrap().catch((error) => {
  statusElement.textContent = error instanceof Error ? error.message : String(error);
  window.__POF_WATCH_PREVIEW_ERROR__ = statusElement.textContent;
});

async function bootstrap() {
  const params = new URLSearchParams(window.location.search);
  const scenario = params.get("scenario");

  if (!scenario) {
    throw new Error("Missing ?scenario=<name> query parameter.");
  }

  const response = await fetch(`/watch-preview-fixtures/${encodeURIComponent(scenario)}.json`);
  if (!response.ok) {
    throw new Error(`Could not load preview fixture for ${scenario}.`);
  }

  const { device, locale, widgets } = await response.json();
  document.documentElement.lang = locale;
  document.body.dataset.framed = String(params.has("framed"));
  statusElement.textContent = `${scenario} • ${locale}`;
  watchShell.dataset.shape = device.shape;
  watchShell.style.setProperty("--shell-width", `${device.width}px`);
  watchShell.style.setProperty("--shell-height", `${device.height}px`);

  const pendingImages = [];
  for (const widget of widgets) {
    if (widget.visible !== false && widget.VISIBLE !== false) {
      watchFace.appendChild(createWidgetElement(widget, device.assetDirectory, pendingImages));
    }
  }

  await Promise.all([...pendingImages, document.fonts.ready]);
  window.__POF_WATCH_PREVIEW_READY__ = true;
}

function createWidgetElement(widget, assetDirectory, pendingImages) {
  switch (widget.type) {
    case "FILL_RECT":
      return createFillRect(widget);
    case "TEXT":
      return createText(widget);
    case "BUTTON":
      return createButton(widget);
    case "IMG":
      return createImage(widget, widget.SRC ?? widget.src, assetDirectory, pendingImages);
    case "SCROLL_LIST":
      return createScrollList(widget, assetDirectory, pendingImages);
    default:
      throw new Error(`Unsupported preview widget: ${widget.type}`);
  }
}

function createFillRect(widget) {
  const element = document.createElement("div");
  element.className = "widget fill-rect";
  applyBounds(element, widget);
  element.style.backgroundColor = toColor(widget.color, "transparent");
  element.style.borderRadius = `${widget.radius ?? 0}px`;
  return element;
}

function createText(widget, text = widget.text) {
  const element = document.createElement("div");
  element.className = "widget text";
  applyBounds(element, widget);
  element.style.fontSize = `${widget.text_size ?? 16}px`;
  element.style.color = toColor(widget.color, "var(--watch-text)");
  element.style.alignItems = toVerticalAlign(widget.align_v);

  const content = document.createElement("span");
  content.textContent = String(text ?? "");
  content.style.textAlign = toHorizontalAlign(widget.align_h);
  content.style.whiteSpace = ["WRAP", "CHAR_WRAP"].includes(widget.text_style) ? "pre-wrap" : "pre";
  content.style.textOverflow = widget.text_style === "ELLIPSIS" ? "ellipsis" : "clip";
  if (widget.text_style === "CHAR_WRAP") {
    content.style.overflowWrap = "anywhere";
  }
  if (Number.isFinite(widget.line_space)) {
    content.style.lineHeight = `calc(1em + ${widget.line_space}px)`;
  }
  if (Number.isFinite(widget.char_space)) {
    content.style.letterSpacing = `${widget.char_space}px`;
  }
  element.appendChild(content);
  return element;
}

function createButton(widget) {
  const element = document.createElement("div");
  element.className = "widget button";
  applyBounds(element, widget);
  element.textContent = String(widget.text ?? "");
  const fallbackTextSize = Math.max(16, Math.floor(Number(widget.h ?? 48) / 2.8));
  element.style.fontSize = `${widget.text_size ?? fallbackTextSize}px`;
  element.style.borderRadius = `${widget.radius ?? 0}px`;
  element.style.background = toColor(widget.normal_color, "var(--watch-accent)");
  element.style.color = toColor(widget.color, "var(--watch-text)");
  return element;
}

function createImage(widget, source, assetDirectory, pendingImages) {
  const image = document.createElement("img");
  image.className = "widget image";
  applyBounds(image, widget);
  image.alt = "";
  if (source) {
    const assetPath = String(source).split("/").map(encodeURIComponent).join("/");
    image.src = `/${assetDirectory}/${assetPath}`;
    pendingImages.push(image.decode().catch(() => {
      throw new Error(`Could not load watch asset: ${assetDirectory}/${source}`);
    }));
  }
  return image;
}

function createScrollList(widget, assetDirectory, pendingImages) {
  const element = document.createElement("div");
  element.className = "widget scroll-list";
  applyBounds(element, widget);

  const rows = widget.data_array.slice(0, widget.data_count);
  const itemConfigs = widget.item_config.slice(0, widget.item_config_count);
  const typeRanges = widget.data_type_config?.slice(0, widget.data_type_config_count) ?? [];
  let rowTop = 0;

  rows.forEach((row, index) => {
    const typeRange = typeRanges.find(({ start, end }) => index >= start && index <= end);
    const itemConfig = typeRange
      ? itemConfigs.find((config) => config.type_id === typeRange.type_id)
      : itemConfigs[0];

    if (!itemConfig) {
      throw new Error(`No SCROLL_LIST configuration for row ${index}.`);
    }

    const card = document.createElement("div");
    card.className = "scroll-card";
    card.style.top = `${rowTop}px`;
    card.style.height = `${itemConfig.item_height}px`;
    card.style.borderRadius = `${itemConfig.item_bg_radius ?? 0}px`;
    card.style.backgroundColor = toColor(itemConfig.item_bg_color, "transparent");
    rowTop += itemConfig.item_height + (widget.item_space ?? 0);

    for (const imageView of itemConfig.image_view?.slice(0, itemConfig.image_view_count) ?? []) {
      card.appendChild(createImage(imageView, row[imageView.key], assetDirectory, pendingImages));
    }

    for (const textView of itemConfig.text_view?.slice(0, itemConfig.text_view_count) ?? []) {
      card.appendChild(createText(textView, row[textView.key]));
    }

    element.appendChild(card);
  });

  return element;
}

function applyBounds(element, widget) {
  element.style.left = `${widget.x ?? 0}px`;
  element.style.top = `${widget.y ?? 0}px`;
  if (Number.isFinite(widget.w)) {
    element.style.width = `${widget.w}px`;
  }
  if (Number.isFinite(widget.h)) {
    element.style.height = `${widget.h}px`;
  }
}

function toColor(value, fallback) {
  if (typeof value !== "number") {
    return fallback;
  }

  return `#${value.toString(16).padStart(6, "0")}`;
}

function toHorizontalAlign(value) {
  if (value === "RIGHT") {
    return "right";
  }
  if (value === "CENTER_H") {
    return "center";
  }
  return "left";
}

function toVerticalAlign(value) {
  if (value === "CENTER_V") {
    return "center";
  }
  if (value === "BOTTOM") {
    return "flex-end";
  }
  return "flex-start";
}
