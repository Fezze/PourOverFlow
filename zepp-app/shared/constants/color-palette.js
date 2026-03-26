export const COLOR_PALETTE = {
  amber: "#D9922E",
  teal: "#2D8C82",
  forest: "#4E7A42",
  coral: "#D6675A",
  indigo: "#4E5FA8",
  slate: "#5E6773"
};

export function getColorHex(token) {
  return COLOR_PALETTE[token] || COLOR_PALETTE.amber;
}

export function getColorNumber(token) {
  return Number.parseInt(getColorHex(token).replace("#", ""), 16);
}
