// The English baseline — always present, always the fallback (PLAN §8.3).
// In the mock this was snapshotted from the DOM at boot; there is no DOM to
// snapshot here, so this file is the canonical source instead. A language
// pack only ever overrides a subset of these keys.
export const EN_STRINGS: Record<string, string> = {
    "nav.dash": "Dashboard",
    "nav.weigh": "Weighing",
    "nav.cameras": "Cameras",
    "nav.reports": "Reports",
    "nav.masters": "Masters",
    "nav.settings": "Settings",
    "nav.help": "Help for this tab",

    tare: "Tare",
    gross: "Gross",
    net: "Net",
    stable: "Stable",
    motion: "Motion",
    ind: "Indicator",
    kg: "kg",

    help: "Help",
    "adm.locked": "Locked",
    "adm.unlocked": "Admin",
};
