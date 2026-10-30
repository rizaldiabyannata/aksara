// SVG figures for the TKA seed questions. sharp turns them into PNG before upload (prisma/seed-tka.ts).
// Drawn in code so the numbers in a figure and in its question come from one place.

const FONT = `font-family="DejaVu Sans, Arial, sans-serif"`;
const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#ffffff"/>${body}</svg>`;

/** A bar split into `parts` equal pieces, the first `shaded` filled. */
function fractionBar(parts: number, shaded: number) {
  const w = 80;
  const cells = Array.from({ length: parts }, (_, i) =>
    `<rect x="${20 + i * w}" y="20" width="${w}" height="90" fill="${i < shaded ? "#f97316" : "#ffffff"}" stroke="#1f2937" stroke-width="3"/>`,
  ).join("");
  return svg(40 + parts * w, 130, cells);
}

type Cube = [x: number, y: number, z: number];
/** Unit cubes in isometric view: x goes right-down, y left-down, z up. Stacks are solid to the floor. */
function cubes(stacks: { x: number; y: number; h: number }[]) {
  const s = 46;
  const cx = s * Math.cos(Math.PI / 6);
  const cy = s * Math.sin(Math.PI / 6);
  const all: Cube[] = stacks.flatMap(({ x, y, h }) => Array.from({ length: h }, (_, z): Cube => [x, y, z]));
  // Painter's order: far (small x+y) first, then bottom to top.
  all.sort((a, b) => a[0] + a[1] - (b[0] + b[1]) || a[2] - b[2]);
  const ox = 260;
  const oy = 190;
  const p = (x: number, y: number, z: number) => `${(ox + (x - y) * cx).toFixed(1)},${(oy + (x + y) * cy - z * s).toFixed(1)}`;
  const face = (pts: string[], fill: string) => `<polygon points="${pts.join(" ")}" fill="${fill}" stroke="#1f2937" stroke-width="2.5" stroke-linejoin="round"/>`;
  const body = all
    .map(([x, y, z]) =>
      [
        face([p(x, y, z + 1), p(x + 1, y, z + 1), p(x + 1, y + 1, z + 1), p(x, y + 1, z + 1)], "#fed7aa"),
        face([p(x + 1, y, z), p(x + 1, y + 1, z), p(x + 1, y + 1, z + 1), p(x + 1, y, z + 1)], "#fb923c"),
        face([p(x, y + 1, z), p(x + 1, y + 1, z), p(x + 1, y + 1, z + 1), p(x, y + 1, z + 1)], "#fdba74"),
      ].join(""),
    )
    .join("");
  return svg(520, 400, body);
}

/** A 10 × 8 rectangle with a 4 × 3 corner cut from the top right. Labels in cm. */
function lShape() {
  const k = 34;
  const X = (u: number) => 100 + u * k;
  const Y = (v: number) => 40 + (8 - v) * k;
  const pts = [[0, 0], [10, 0], [10, 5], [6, 5], [6, 8], [0, 8]].map(([u, v]) => `${X(u)},${Y(v)}`).join(" ");
  const label = (x: number, y: number, t: string, anchor = "middle") =>
    `<text x="${x}" y="${y}" ${FONT} font-size="22" fill="#111827" text-anchor="${anchor}">${t}</text>`;
  return svg(520, 380,
    `<polygon points="${pts}" fill="#dbeafe" stroke="#1e3a8a" stroke-width="3"/>` +
    label(X(5), Y(0) + 30, "10 cm") +
    label(X(0) - 10, Y(4) + 7, "8 cm", "end") +
    label(X(3), Y(8) - 10, "6 cm") +
    label(X(6) + 10, Y(6.5) + 7, "3 cm", "start") +
    label(X(8), Y(5) - 10, "4 cm") +
    label(X(10) + 10, Y(2.5) + 7, "5 cm", "start"),
  );
}

export const EKSKUL: [string, number][] = [["Pramuka", 12], ["Tari", 8], ["Futsal", 15], ["Melukis", 6], ["Paduan Suara", 9]];

/** Bar chart of EKSKUL with gridlines every 2 and the value above each bar. */
function barChart() {
  const left = 70;
  const base = 330;
  const unit = 18;
  const bw = 70;
  const gap = 34;
  const grid = Array.from({ length: 9 }, (_, i) => i * 2)
    .map((v) =>
      `<line x1="${left}" y1="${base - v * unit}" x2="${left + 5 * (bw + gap) + gap}" y2="${base - v * unit}" stroke="#d1d5db" stroke-width="1"/>` +
      `<text x="${left - 10}" y="${base - v * unit + 6}" ${FONT} font-size="16" fill="#374151" text-anchor="end">${v}</text>`,
    )
    .join("");
  const bars = EKSKUL.map(([name, v], i) => {
    const x = left + gap + i * (bw + gap);
    return (
      `<rect x="${x}" y="${base - v * unit}" width="${bw}" height="${v * unit}" fill="#3b82f6" stroke="#1e3a8a" stroke-width="2"/>` +
      `<text x="${x + bw / 2}" y="${base - v * unit - 8}" ${FONT} font-size="18" font-weight="bold" fill="#111827" text-anchor="middle">${v}</text>` +
      `<text x="${x + bw / 2}" y="${base + 26}" ${FONT} font-size="16" fill="#111827" text-anchor="middle">${name}</text>`
    );
  }).join("");
  return svg(640, 400,
    grid + bars +
    `<line x1="${left}" y1="${base}" x2="${left}" y2="${base - 16 * unit - 10}" stroke="#111827" stroke-width="2"/>` +
    `<line x1="${left}" y1="${base}" x2="${left + 5 * (bw + gap) + gap}" y2="${base}" stroke="#111827" stroke-width="2"/>` +
    `<text x="20" y="${base - 8 * unit}" ${FONT} font-size="16" fill="#374151" transform="rotate(-90 20 ${base - 8 * unit})" text-anchor="middle">Banyak siswa</text>`,
  );
}

// Tampak-atas question: 5 stacks (8 cubes) over 5 floor squares; tall stacks at the back so every top shows.
export const STACKS_TOP = [{ x: 0, y: 0, h: 3 }, { x: 1, y: 0, h: 2 }, { x: 2, y: 0, h: 1 }, { x: 0, y: 1, h: 1 }, { x: 1, y: 1, h: 1 }];
// Counting question: a 2 × 2 floor with heights 3, 2, 2, 1 (8 cubes, the lower back ones hidden).
export const STACKS_COUNT = [{ x: 0, y: 0, h: 3 }, { x: 1, y: 0, h: 2 }, { x: 0, y: 1, h: 2 }, { x: 1, y: 1, h: 1 }];

export const FIGURES = {
  pecahan: () => fractionBar(8, 6),
  kubusAtas: () => cubes(STACKS_TOP),
  kubusHitung: () => cubes(STACKS_COUNT),
  bangunL: lShape,
  diagramEkskul: barChart,
} as const;
export type FigureName = keyof typeof FIGURES;
