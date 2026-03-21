export const TOOL_CATALOG = [
  {
    schemaVersion: 1,
    toolId: "tool_aeropress",
    label: "AeroPress",
    iconStem: "tool-aeropress",
    sortOrder: 10,
    supported: true,
    description: "Immersion / pressure hybrid"
  },
  {
    schemaVersion: 1,
    toolId: "tool_v60",
    label: "Hario V60",
    iconStem: "tool-v60",
    sortOrder: 20,
    supported: true,
    description: "Classic conical pour-over"
  },
  {
    schemaVersion: 1,
    toolId: "tool_kalita_wave",
    label: "Kalita Wave",
    iconStem: "tool-kalita-wave",
    sortOrder: 30,
    supported: true,
    description: "Flat-bed pour-over"
  },
  {
    schemaVersion: 1,
    toolId: "tool_chemex",
    label: "Chemex",
    iconStem: "tool-chemex",
    sortOrder: 40,
    supported: true,
    description: "Large paper filter brewer"
  },
  {
    schemaVersion: 1,
    toolId: "tool_clever_dripper",
    label: "Clever Dripper",
    iconStem: "tool-clever-dripper",
    sortOrder: 50,
    supported: true,
    description: "Immersion with controlled drawdown"
  },
  {
    schemaVersion: 1,
    toolId: "tool_french_press",
    label: "French Press",
    iconStem: "tool-french-press",
    sortOrder: 60,
    supported: true,
    description: "Full immersion brewer"
  }
];

export const TOOL_IDS = TOOL_CATALOG.map((tool) => tool.toolId);

export function getSupportedTools() {
  return [...TOOL_CATALOG].sort((left, right) => left.sortOrder - right.sortOrder);
}

export function getToolById(toolId) {
  return TOOL_CATALOG.find((tool) => tool.toolId === toolId) || null;
}
