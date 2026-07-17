// Generates stylized SVG "box art" for the demo search (Pokémon Esmeralda).
// Run: node scripts/gen-demo-covers.mjs  → writes public/demo/*.svg
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "public", "demo");
fs.mkdirSync(OUT, { recursive: true });

const REGION = {
  ES: { flag: ["#c60b1e", "#ffc400", "#c60b1e"], tag: "PAL ESPAÑA", sub: "Totalmente en castellano" },
  FR: { flag: ["#0055a4", "#ffffff", "#ef4135"], tag: "PAL FRANCE", sub: "Version française" },
  UK: { flag: ["#012169", "#ffffff", "#c8102e"], tag: "PAL UK", sub: "English version" },
  DE: { flag: ["#000000", "#dd0000", "#ffce00"], tag: "PAL DEUTSCHLAND", sub: "Deutsche Version" },
  NEUTRAL: { flag: ["#3b4048", "#6b7280", "#9ca3af"], tag: "PAL", sub: "" },
};

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// side: "front" | "back"
function cover({ region, side, wear = 0 }) {
  const r = REGION[region] ?? REGION.NEUTRAL;
  const W = 480, H = 640;
  const [c1, c2, c3] = r.flag;
  const emerald = "#0f7b52";
  const bg = side === "back" ? "#e9e4d8" : emerald;

  const flagBars = `
    <rect x="0" y="0" width="${W}" height="8" fill="${c1}"/>
    <rect x="0" y="8" width="${W}" height="8" fill="${c2}"/>
    <rect x="0" y="16" width="${W}" height="8" fill="${c3}"/>`;

  let body;
  if (side === "front") {
    body = `
      <rect x="0" y="0" width="${W}" height="${H}" fill="${bg}"/>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#sheen)"/>
      ${flagBars}
      <text x="${W / 2}" y="120" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="34" font-weight="900" fill="#ffffff" letter-spacing="1">POKÉMON</text>
      <text x="${W / 2}" y="170" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="54" font-weight="900" fill="#8ee6b8" letter-spacing="1">ESMERALDA</text>
      <circle cx="${W / 2}" cy="360" r="150" fill="#0b5c3d"/>
      <circle cx="${W / 2}" cy="360" r="118" fill="#0d6e49" stroke="#8ee6b8" stroke-width="6"/>
      <text x="${W / 2}" y="378" text-anchor="middle" font-family="Arial, sans-serif" font-size="90" fill="#eafff5">✦</text>
      <rect x="30" y="560" width="${W - 60}" height="54" rx="6" fill="#0b5c3d" stroke="#8ee6b8" stroke-width="2"/>
      <text x="${W / 2}" y="595" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#eafff5" font-weight="bold">GAME BOY ADVANCE</text>
    `;
  } else {
    // Back cover: language list + PAL stamp + description block
    const langs = region === "ES"
      ? "ES · EN · FR · DE · IT"
      : region === "FR" ? "FR · EN · DE"
      : region === "DE" ? "DE · EN · NL"
      : region === "UK" ? "EN"
      : "—";
    const desc = region === "ES"
      ? "Conviértete en Campeón de la Liga Pokémon mientras frustras los planes de los Equipos Aqua y Magma. Explora la región de Hoenn."
      : region === "FR" ? "Deviens le Maître de la Ligue Pokémon et explore la région de Hoenn."
      : region === "DE" ? "Werde Champion der Pokémon-Liga und erkunde die Hoenn-Region."
      : region === "UK" ? "Become the Champion of the Pokémon League and explore the Hoenn region."
      : "Descripción no legible en la foto.";
    body = `
      <rect x="0" y="0" width="${W}" height="${H}" fill="${bg}"/>
      ${flagBars}
      <rect x="26" y="46" width="${W - 52}" height="150" rx="6" fill="#ffffff" stroke="#b8b0a0"/>
      <rect x="34" y="54" width="150" height="134" rx="4" fill="#0f7b52" opacity="0.85"/>
      <text x="109" y="128" text-anchor="middle" font-family="Arial, sans-serif" font-size="46" fill="#eafff5">✦</text>
      <text x="30" y="240" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#333">${esc(r.tag)}</text>
      <text x="30" y="270" font-family="Arial, sans-serif" font-size="16" fill="#555">${esc(r.sub)}</text>
      <rect x="26" y="300" width="${W - 52}" height="150" rx="6" fill="#f6f3ea" stroke="#cfc7b6"/>
      <foreignObject x="40" y="312" width="${W - 80}" height="130">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;font-size:15px;color:#333;line-height:1.35">${esc(desc)}</div>
      </foreignObject>
      <text x="30" y="500" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#333">Idiomas / Languages:</text>
      <text x="30" y="528" font-family="Arial, sans-serif" font-size="20" fill="#0b5c3d" font-weight="bold">${esc(langs)}</text>
      <rect x="300" y="470" width="150" height="70" rx="8" fill="#111" />
      <text x="375" y="500" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="#fff">PEGI</text>
      <text x="375" y="524" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" fill="#fff" font-weight="bold">3</text>
      <text x="30" y="600" font-family="monospace" font-size="14" fill="#666">AGB-BPEE-${region}</text>
    `;
  }

  const wearOverlay = wear
    ? `<rect x="0" y="0" width="${W}" height="${H}" fill="#000" opacity="${0.04 * wear}"/>
       <circle cx="${60 + wear * 30}" cy="${80 + wear * 40}" r="${8 + wear * 3}" fill="#000" opacity="0.08"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.12"/>
    </linearGradient>
  </defs>
  ${body}
  ${wearOverlay}
</svg>`;
}

function sanitize(svg) {
  return svg;
}

const files = {
  "front-es.svg": { region: "ES", side: "front" },
  "back-es.svg": { region: "ES", side: "back" },
  "front-fr.svg": { region: "FR", side: "front" },
  "back-fr.svg": { region: "FR", side: "back" },
  "front-uk.svg": { region: "UK", side: "front" },
  "back-uk.svg": { region: "UK", side: "back" },
  "front-de.svg": { region: "DE", side: "front" },
  "back-de.svg": { region: "DE", side: "back" },
  "front-neutral.svg": { region: "NEUTRAL", side: "front", wear: 2 },
  "back-blurry.svg": { region: "NEUTRAL", side: "back", wear: 3 },
};

for (const [name, opts] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, name), sanitize(cover(opts)), "utf8");
}
console.log("Wrote", Object.keys(files).length, "demo SVGs to", OUT);
