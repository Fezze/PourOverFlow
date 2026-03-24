import * as hmUI from "@zos/ui";
import { getDeviceInfo } from "@zos/device";
import { px } from "@zos/utils";

const DEFAULT_LAYOUT_SIZE = {
  width: 480,
  height: 480
};

function readLayoutDeviceSize() {
  try {
    const deviceInfo = getDeviceInfo();

    if (
      deviceInfo &&
      Number.isFinite(deviceInfo.width) &&
      deviceInfo.width > 0 &&
      Number.isFinite(deviceInfo.height) &&
      deviceInfo.height > 0
    ) {
      return {
        width: deviceInfo.width,
        height: deviceInfo.height
      };
    }
  } catch (error) {
    console.log("Falling back to default layout size", error);
  }

  return { ...DEFAULT_LAYOUT_SIZE };
}

const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT } = readLayoutDeviceSize();

export const SHARED_COLORS = {
  background: 0x0e1218,
  surface: 0x171d26,
  surfaceMuted: 0x202833,
  text: 0xf5f7fa,
  muted: 0xaab4c2,
  primary: 0x2d8c82,
  primaryPress: 0x236b64,
  secondary: 0x2a3340,
  secondaryPress: 0x202733,
  accent: 0xd9922e,
  accentPress: 0xaf6f19,
  danger: 0xd6675a,
  dangerPress: 0xa14c43,
  neutral: 0x434f5f,
  neutralPress: 0x303947
};

export function createScaffoldLayout(options = {}) {
  const isRound = options.shape === "round";
  const horizontalPadding = isRound ? 36 : 28;
  const titleY = isRound ? 42 : 30;
  const subtitleY = isRound ? 84 : 66;
  const bodyY = isRound ? 126 : 102;
  const buttonStartY = isRound ? 252 : 214;
  const buttonHeight = isRound ? 46 : 44;
  const buttonGap = isRound ? 10 : 8;

  return {
    background: {
      x: 0,
      y: 0,
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT,
      color: SHARED_COLORS.background
    },
    title: {
      x: px(horizontalPadding),
      y: px(titleY),
      w: DEVICE_WIDTH - px(horizontalPadding * 2),
      h: px(34),
      color: SHARED_COLORS.text,
      text_size: px(isRound ? 30 : 28),
      align_h: hmUI.align.LEFT,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.WRAP
    },
    subtitle: {
      x: px(horizontalPadding),
      y: px(subtitleY),
      w: DEVICE_WIDTH - px(horizontalPadding * 2),
      h: px(30),
      color: SHARED_COLORS.muted,
      text_size: px(16),
      align_h: hmUI.align.LEFT,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.WRAP
    },
    body: {
      x: px(horizontalPadding),
      y: px(bodyY),
      w: DEVICE_WIDTH - px(horizontalPadding * 2),
      h: px(isRound ? 88 : 74),
      color: SHARED_COLORS.text,
      text_size: px(18),
      align_h: hmUI.align.LEFT,
      align_v: hmUI.align.TOP,
      text_style: hmUI.text_style.WRAP
    },
    footer: {
      x: px(horizontalPadding),
      y: DEVICE_HEIGHT - px(isRound ? 66 : 56),
      w: DEVICE_WIDTH - px(horizontalPadding * 2),
      h: px(38),
      color: SHARED_COLORS.muted,
      text_size: px(14),
      align_h: hmUI.align.LEFT,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.WRAP
    },
    buttonX: px(horizontalPadding),
    buttonY: px(buttonStartY),
    buttonW: DEVICE_WIDTH - px(horizontalPadding * 2),
    buttonH: px(buttonHeight),
    buttonGap: px(buttonGap)
  };
}

export function createButtonStyle(layout, index, theme = "primary") {
  const themes = {
    primary: {
      normal: SHARED_COLORS.primary,
      press: SHARED_COLORS.primaryPress
    },
    secondary: {
      normal: SHARED_COLORS.secondary,
      press: SHARED_COLORS.secondaryPress
    },
    accent: {
      normal: SHARED_COLORS.accent,
      press: SHARED_COLORS.accentPress
    },
    danger: {
      normal: SHARED_COLORS.danger,
      press: SHARED_COLORS.dangerPress
    },
    neutral: {
      normal: SHARED_COLORS.neutral,
      press: SHARED_COLORS.neutralPress
    }
  };
  const palette = themes[theme] || themes.primary;

  return {
    x: layout.buttonX,
    y: layout.buttonY + index * (layout.buttonH + layout.buttonGap),
    w: layout.buttonW,
    h: layout.buttonH,
    radius: px(18),
    text_size: px(18),
    normal_color: palette.normal,
    press_color: palette.press,
    color: SHARED_COLORS.text
  };
}

export function createPanelStyle(layout, options = {}) {
  return {
    x: options.x ?? layout.buttonX,
    y: options.y ?? layout.body.y - px(12),
    w: options.w ?? layout.buttonW,
    h: options.h ?? px(104),
    radius: options.radius ?? px(24),
    color: options.color ?? SHARED_COLORS.surface
  };
}
