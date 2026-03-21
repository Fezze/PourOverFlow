import * as hmUI from "@zos/ui";
import { getDeviceInfo } from "@zos/device";
import { px } from "@zos/utils";

const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT } = getDeviceInfo();

const SHARED_COLORS = {
  background: 0x101214,
  text: 0xffffff,
  muted: 0xb0bac5,
  primary: 0x2d8c82,
  primaryPress: 0x236b64,
  secondary: 0x4e5fa8,
  secondaryPress: 0x3b487d,
  accent: 0xd9922e,
  accentPress: 0xa96b1f,
  danger: 0xd6675a,
  dangerPress: 0xa14c43,
  neutral: 0x5e6773,
  neutralPress: 0x454c55
};

export function createScaffoldLayout(options = {}) {
  const isRound = options.shape === "round";
  const horizontalPadding = isRound ? 44 : 30;
  const titleY = isRound ? 40 : 28;
  const subtitleY = isRound ? 80 : 62;
  const bodyY = isRound ? 118 : 98;
  const buttonStartY = isRound ? 206 : 170;
  const buttonHeight = isRound ? 50 : 46;
  const buttonGap = isRound ? 12 : 10;

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
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.WRAP
    },
    subtitle: {
      x: px(horizontalPadding),
      y: px(subtitleY),
      w: DEVICE_WIDTH - px(horizontalPadding * 2),
      h: px(30),
      color: SHARED_COLORS.muted,
      text_size: px(18),
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.WRAP
    },
    body: {
      x: px(horizontalPadding),
      y: px(bodyY),
      w: DEVICE_WIDTH - px(horizontalPadding * 2),
      h: px(isRound ? 78 : 64),
      color: SHARED_COLORS.text,
      text_size: px(18),
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.WRAP
    },
    footer: {
      x: px(horizontalPadding),
      y: DEVICE_HEIGHT - px(isRound ? 66 : 56),
      w: DEVICE_WIDTH - px(horizontalPadding * 2),
      h: px(38),
      color: SHARED_COLORS.muted,
      text_size: px(14),
      align_h: hmUI.align.CENTER_H,
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
    radius: px(12),
    text_size: px(18),
    normal_color: palette.normal,
    press_color: palette.press,
    color: SHARED_COLORS.text
  };
}
