window.MonexConstants = {
  symbolOptions: ["✕", "◯", "△", "□", "◆", "●", "★", "✦", "⬟", "◇"],

  colourOptions: [
    "#d62828",
    "#1d4ed8",
    "#15803d",
    "#7c3aed",
    "#ea580c",
    "#0891b2",
    "#c026d3",
    "#374151",
    "#111827",
    "#b45309"
  ],

  aiLevels: ["Easy", "Medium", "Hard", "Extreme"],

  defaultSettings: {
    playerCount: 2,
    boardSize: 5,
    timerMinutes: 3,
    aiLevel: "Easy"
  },

  defaultPlayerTemplates: [
    { symbol: "✕", colour: "#d62828", isAI: false },
    { symbol: "◯", colour: "#1d4ed8", isAI: false },
    { symbol: "△", colour: "#15803d", isAI: false }
  ]
};