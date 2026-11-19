import { ESPRESSO_COLORS } from "../shared/constants/espresso-colors.js";

export const COLORS = Object.fromEntries(
  Object.entries(ESPRESSO_COLORS).map(([name, value]) => [name, `#${value.toString(16).padStart(6, "0")}`])
);

export const STACK = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  minWidth: "0"
};

export const ROW = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: "10px"
};

export const ROOT_VIEW = {
  ...STACK,
  gap: "18px",
  padding: "16px 16px 32px",
  minHeight: "100vh",
  boxSizing: "border-box",
  backgroundColor: COLORS.background,
  color: COLORS.text
};

export const PANEL = {
  ...STACK,
  gap: "14px",
  backgroundColor: COLORS.surface,
  borderRadius: "20px",
  padding: "16px"
};

export const TITLE = {
  color: COLORS.text,
  fontSize: "18px",
  fontWeight: "650",
  lineHeight: "25px",
  overflowWrap: "anywhere",
  whiteSpace: "pre-wrap"
};

export const BODY = {
  color: COLORS.muted,
  fontSize: "15px",
  lineHeight: "22px",
  overflowWrap: "anywhere",
  whiteSpace: "pre-wrap"
};

export const PRIMARY_VALUE = {
  ...BODY,
  color: COLORS.primary,
  fontWeight: "600"
};

export const ACTION = {
  minHeight: "44px",
  padding: "10px 16px",
  borderRadius: "999px",
  border: "0",
  boxShadow: "none",
  backgroundColor: COLORS.secondary,
  color: COLORS.text,
  textAlign: "center",
  fontSize: "14px",
  fontWeight: "650",
  lineHeight: "20px"
};

export const PRIMARY_ACTION = {
  ...ACTION,
  backgroundColor: COLORS.primary,
  color: COLORS.background
};

export const DANGER_ACTION = {
  ...ACTION,
  backgroundColor: COLORS.surfaceMuted,
  color: "#f5a99f"
};

export const FIELD_LABEL = {
  ...BODY,
  color: COLORS.text,
  fontWeight: "550"
};
