export type TextureCategory =
  | 'texturas'
  | 'formas'
  | 'flores'
  | 'silhuetas'
  | 'arabescos'
  | 'animais'
  | 'bichos'
  | 'imagem';

export const TEXTURE_CATEGORIES: { id: TextureCategory; label: string }[] = [
  { id: 'texturas', label: 'Texturas' },
  { id: 'formas', label: 'Formas' },
  { id: 'flores', label: 'Flores' },
  { id: 'silhuetas', label: 'Silhuetas' },
  { id: 'arabescos', label: 'Arabescos' },
  { id: 'animais', label: 'Animais' },
  { id: 'bichos', label: 'Bichos' },
  { id: 'imagem', label: 'Imagem' },
];

export type PatternGrid = {
  tiles: number;
  pitch: number;
  y0: number;
  rows: number;
  single: boolean;
  invert: boolean;
};

const TWO_PI = Math.PI * 2;
const EDGE = 0.04;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const clamp01 = (value: number) => clamp(value, 0, 1);
const smoothstep = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

// Signed distance (negative inside) to 0..1 coverage with a soft edge.
const soft = (distance: number) => smoothstep(0.5 - distance / (2 * EDGE));

const circle = (x: number, y: number, cx: number, cy: number, r: number) => Math.hypot(x - cx, y - cy) - r;

const ellipse = (x: number, y: number, cx: number, cy: number, a: number, b: number) =>
  (Math.hypot((x - cx) / a, (y - cy) / b) - 1) * Math.min(a, b);

function box(x: number, y: number, cx: number, cy: number, halfWidth: number, halfHeight: number) {
  const dx = Math.abs(x - cx) - halfWidth;
  const dy = Math.abs(y - cy) - halfHeight;
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0);
}

function triangle(px: number, py: number, ax: number, ay: number, bx: number, by: number, cx: number, cy: number) {
  const points = [[ax, ay], [bx, by], [cx, cy]];
  const orientation = Math.sign((bx - ax) * (ay - cy) - (by - ay) * (ax - cx));
  let distance = Infinity;
  let side = Infinity;
  for (let i = 0; i < 3; i++) {
    const [sx, sy] = points[i];
    const [ex, ey] = points[(i + 1) % 3];
    const edgeX = ex - sx;
    const edgeY = ey - sy;
    const vx = px - sx;
    const vy = py - sy;
    const t = clamp01((vx * edgeX + vy * edgeY) / (edgeX * edgeX + edgeY * edgeY));
    const qx = vx - edgeX * t;
    const qy = vy - edgeY * t;
    distance = Math.min(distance, qx * qx + qy * qy);
    side = Math.min(side, orientation * (vx * edgeY - vy * edgeX));
  }
  return -Math.sqrt(distance) * Math.sign(side);
}

function hexagon(px: number, py: number, r: number) {
  const kx = -0.8660254;
  const ky = 0.5;
  const kz = 0.5773503;
  let x = Math.abs(px);
  let y = Math.abs(py);
  const m = 2 * Math.min(kx * x + ky * y, 0);
  x -= m * kx;
  y -= m * ky;
  x -= clamp(x, -kz * r, kz * r);
  y -= r;
  return Math.hypot(x, y) * Math.sign(y);
}

function star(x: number, y: number, outer: number, inner: number) {
  const angle = Math.atan2(y, x);
  const t = (((angle - Math.PI / 2) * 5) / TWO_PI + 0.5) % 1;
  const wave = Math.abs(2 * (t < 0 ? t + 1 : t) - 1);
  return Math.hypot(x, y) - (inner + (outer - inner) * (1 - wave));
}

function heart(x: number, y: number) {
  const px = x / 0.3;
  const py = (y - 0.02) / 0.3;
  return (Math.pow(px * px + py * py - 1, 3) - px * px * py * py * py) * 0.06;
}

// A zigzag with period 1 in x, ranging -1..1.
const zigzag = (x: number) => 1 - 4 * Math.abs(x);

type Point = readonly [number, number];
// Leaf: base x, base y, length, width, angle in degrees.
type Leaf = readonly [number, number, number, number, number];

const RAD = Math.PI / 180;

function segmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = clamp01(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1));
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}

// Signed distance to a polyline drawn with the given stroke width.
function stroke(x: number, y: number, points: readonly Point[], width: number) {
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    best = Math.min(best, segmentDistance(x, y, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]));
  }
  return best - width / 2;
}

// Pointed leaf: the lens where two circular arcs overlap.
function leafShape(x: number, y: number, [bx, by, length, width, angle]: Leaf) {
  const dx = Math.cos(angle * RAD);
  const dy = Math.sin(angle * RAD);
  const u = (x - bx) * dx + (y - by) * dy - length / 2;
  const v = -(x - bx) * dy + (y - by) * dx;
  const halfLength = length / 2;
  const halfWidth = width / 2;
  const radius = (halfLength * halfLength + halfWidth * halfWidth) / (2 * halfWidth);
  return Math.max(Math.hypot(u, v - (halfWidth - radius)) - radius, Math.hypot(u, v + (halfWidth - radius)) - radius);
}

function leafSet(x: number, y: number, list: readonly Leaf[]) {
  let best = Infinity;
  for (const item of list) best = Math.min(best, leafShape(x, y, item));
  return best;
}

function bezier(p0: Point, p1: Point, p2: Point, p3: Point, steps = 32): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const m = 1 - t;
    points.push([
      m * m * m * p0[0] + 3 * m * m * t * p1[0] + 3 * m * t * t * p2[0] + t * t * t * p3[0],
      m * m * m * p0[1] + 3 * m * m * t * p1[1] + 3 * m * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return points;
}

// Leaves attached along a bezier stem: t, side (+1/-1/0), length, width, spread angle from the stem.
function leavesAlong(p0: Point, p1: Point, p2: Point, p3: Point, specs: readonly (readonly number[])[]): Leaf[] {
  return specs.map(([t, side, length, width, spread]) => {
    const m = 1 - t;
    const bx = m * m * m * p0[0] + 3 * m * m * t * p1[0] + 3 * m * t * t * p2[0] + t * t * t * p3[0];
    const by = m * m * m * p0[1] + 3 * m * m * t * p1[1] + 3 * m * t * t * p2[1] + t * t * t * p3[1];
    const dx = 3 * m * m * (p1[0] - p0[0]) + 6 * m * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
    const dy = 3 * m * m * (p1[1] - p0[1]) + 6 * m * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
    return [bx, by, length, width, Math.atan2(dy, dx) / RAD + side * spread];
  });
}

function spiral(cx: number, cy: number, r0: number, r1: number, turns: number, start: number, steps = 56): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = start + t * turns * TWO_PI;
    const radius = r0 + (r1 - r0) * t;
    points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
  }
  return points;
}

// Flower outline with n rounded petals.
function flower(x: number, y: number, cx: number, cy: number, radius: number, petals: number) {
  const dx = x - cx;
  const dy = y - cy;
  const lobe = Math.pow(Math.abs(Math.cos((petals * Math.atan2(dy, dx)) / 2)), 1.2);
  return Math.hypot(dx, dy) - radius * (0.3 + 0.7 * lobe);
}

const negate = (p: Point): Point => [-p[0], -p[1]];

const CURL = spiral(0.1, 0.1, 0.26, 0.04, 1.5, 0.9 * Math.PI);
const CURL_TAIL: Point[] = [CURL[0], [-0.2, 0.02], [-0.2, -0.2], [-0.1, -0.4]];
const CURL_LEAVES: Leaf[] = [[-0.2, 0, 0.2, 0.1, 150], [-0.2, -0.22, 0.2, 0.1, 25]];

const SCROLL_HALF = spiral(-0.17, 0.17, 0.24, 0.045, 1.25, -Math.PI / 4);
const SCROLL = [...[...SCROLL_HALF].reverse(), ...SCROLL_HALF.map(negate)];
const SCROLL_BUDS: Point[] = [SCROLL_HALF[SCROLL_HALF.length - 1], negate(SCROLL_HALF[SCROLL_HALF.length - 1])];
const SCROLL_LEAVES: Leaf[] = [[0.12, -0.04, 0.3, 0.13, -35], [-0.12, 0.04, 0.3, 0.13, 145]];

const VINE: Point[] = Array.from({ length: 51 }, (_, i) => {
  const x = -0.5 + i / 50;
  return [x, 0.12 * Math.sin(TWO_PI * x)];
});
const VINE_LEAVES: Leaf[] = [[0.25, 0.12, 0.32, 0.15, 50], [-0.25, -0.12, 0.32, 0.15, 230]];

const JACOB_STEM = bezier([-0.02, -0.45], [0.28, -0.28], [-0.3, -0.02], [0.02, 0.1]);
const JACOB_LEAVES: Leaf[] = [[0.08, -0.3, 0.26, 0.12, 30], [-0.12, -0.12, 0.24, 0.11, 150]];

const WREATH: Leaf[] = Array.from({ length: 10 }, (_, i) => {
  const angle = i * 36;
  return [0.3 * Math.cos(angle * RAD), 0.3 * Math.sin(angle * RAD), 0.24, 0.11, angle + 100];
});

const POPPY_STEM: Point[] = [[0, 0.1], [0.03, -0.1], [-0.02, -0.3], [0, -0.45]];
const POPPY_LEAVES: Leaf[] = [[0.02, -0.2, 0.3, 0.14, 35], [-0.02, -0.32, 0.26, 0.12, 145]];

const LOTUS: Leaf[] = [
  [0, -0.3, 0.6, 0.2, 90],
  [0, -0.3, 0.52, 0.18, 62],
  [0, -0.3, 0.52, 0.18, 118],
  [0, -0.3, 0.4, 0.15, 32],
  [0, -0.3, 0.4, 0.15, 148],
];

const ROSE_SPIRAL = spiral(0, 0.1, 0.02, 0.24, 2.2, 0);
const ROSE_STEM: Point[] = [[0, -0.15], [0, -0.45]];
const ROSE_LEAVES: Leaf[] = [[-0.05, -0.18, 0.25, 0.12, 200], [0.05, -0.18, 0.25, 0.12, -20]];

const LAVENDER_STEM: Point[] = [[0, -0.45], [0.01, 0.38]];
const LAVENDER_BUDS: (readonly [number, number, number, number])[] = [
  [0.01, 0.4, 0.04, 0.065],
  ...Array.from({ length: 7 }, (_, i): readonly [number, number, number, number] => [-0.055, -0.04 + i * 0.075, 0.04, 0.06]),
  ...Array.from({ length: 7 }, (_, i): readonly [number, number, number, number] => [0.065, -0.04 + i * 0.075, 0.04, 0.06]),
];
const LAVENDER_LEAVES: Leaf[] = [[0, -0.3, 0.24, 0.09, 30], [0, -0.28, 0.24, 0.09, 150]];

const BRANCH_STEM = bezier([-0.3, -0.4], [-0.1, -0.1], [0.05, 0.1], [0.22, 0.3]);
const BRANCH_LEAVES = leavesAlong([-0.3, -0.4], [-0.1, -0.1], [0.05, 0.1], [0.22, 0.3], [
  [0.25, 1, 0.22, 0.1, 55],
  [0.4, -1, 0.22, 0.1, 55],
  [0.58, 1, 0.21, 0.1, 55],
  [0.74, -1, 0.2, 0.09, 55],
  [0.92, 1, 0.17, 0.08, 45],
  [1, 0, 0.16, 0.08, 0],
]);

const BOUQUET_FLOWERS: Point[] = [[-0.22, 0.2], [0.22, 0.2], [0, 0.33]];
const BOUQUET_LEAVES: Leaf[] = [[0, -0.3, 0.26, 0.1, 40], [0, -0.28, 0.26, 0.1, 140]];

const FERN_STEM = bezier([-0.1, -0.45], [-0.05, -0.1], [0.08, 0.15], [0.1, 0.45]);
const FERN_LEAVES = leavesAlong(
  [-0.1, -0.45],
  [-0.05, -0.1],
  [0.08, 0.15],
  [0.1, 0.45],
  [
    ...Array.from({ length: 10 }, (_, i) => {
      const t = (i + 0.6) / 10.4;
      const length = 0.22 * (1 - 0.65 * t);
      return [[t, 1, length, length * 0.35, 62], [t, -1, length, length * 0.35, 62]];
    }).flat(),
    [1, 0, 0.12, 0.05, 0],
  ],
);

type Motif = (x: number, y: number) => number;

type Definition = { id: string; label: string; category: string; repeat: number; stagger: boolean; fn: Motif };

const DEFS = [
  { id: 'ondas', label: 'Ondas', category: 'texturas', repeat: 2, stagger: false,
    fn: (x, y) => smoothstep(1 - Math.abs(y - 0.16 * Math.sin(TWO_PI * x)) / 0.24) },
  { id: 'caneluras', label: 'Caneluras', category: 'texturas', repeat: 2, stagger: false,
    fn: (x) => Math.pow(0.5 + 0.5 * Math.cos(TWO_PI * x), 0.8) },
  { id: 'listras', label: 'Listras', category: 'texturas', repeat: 2, stagger: false,
    fn: (_x, y) => soft(Math.abs(y) - 0.22) },
  { id: 'meiacana', label: 'Meia-cana', category: 'texturas', repeat: 2, stagger: false,
    fn: (_x, y) => Math.sqrt(Math.max(0, 1 - 4 * y * y)) },
  { id: 'zigzag', label: 'Zigue-zague', category: 'texturas', repeat: 2, stagger: false,
    fn: (x, y) => soft(Math.abs(y - 0.12 * zigzag(x)) - 0.09) },
  { id: 'favo', label: 'Favo', category: 'texturas', repeat: 2, stagger: true,
    fn: (x, y) => soft(hexagon(x, y, 0.42)) },
  { id: 'escamas', label: 'Escamas', category: 'texturas', repeat: 2, stagger: true,
    fn: (x, y) => soft(Math.abs(circle(x, y, 0, -0.2, 0.5)) - 0.05) },
  { id: 'pontos', label: 'Pontos', category: 'texturas', repeat: 2, stagger: true,
    fn: (x, y) => soft(circle(x, y, 0, 0, 0.18)) },
  { id: 'espinhos', label: 'Espinhos', category: 'texturas', repeat: 2, stagger: true,
    fn: (x, y) => Math.max(0, 1 - Math.hypot(x, y) / 0.45) },
  { id: 'xadrez', label: 'Xadrez', category: 'texturas', repeat: 2, stagger: false,
    fn: (x, y) => {
      const a = smoothstep(x / 0.06 + 0.5);
      const b = smoothstep(y / 0.06 + 0.5);
      return a * b + (1 - a) * (1 - b);
    } },
  { id: 'piramides', label: 'Pirâmides', category: 'texturas', repeat: 2, stagger: false,
    fn: (x, y) => Math.max(0, 1 - (Math.abs(x) + Math.abs(y)) / 0.5) },
  { id: 'domos', label: 'Domos', category: 'texturas', repeat: 2, stagger: true,
    fn: (x, y) => Math.sqrt(Math.max(0, 1 - Math.pow(Math.hypot(x, y) / 0.42, 2))) },
  { id: 'aneis', label: 'Anéis', category: 'texturas', repeat: 2, stagger: true,
    fn: (x, y) => smoothstep(1 - Math.abs(Math.hypot(x, y) - 0.26) / 0.1) },
  { id: 'tijolos', label: 'Tijolos', category: 'texturas', repeat: 2, stagger: true,
    fn: (x, y) => soft(box(x, y, 0, 0, 0.4, 0.17) - 0.04) },
  { id: 'diagonais', label: 'Diagonais', category: 'texturas', repeat: 2, stagger: false,
    fn: (x, y) => Math.pow(0.5 + 0.5 * Math.cos(TWO_PI * (x + y)), 1.2) },
  { id: 'grade', label: 'Grade', category: 'texturas', repeat: 2, stagger: false,
    fn: (x, y) => Math.max(smoothstep(1 - Math.abs(x) / 0.1), smoothstep(1 - Math.abs(y) / 0.1)) },
  { id: 'serpentina', label: 'Serpentina', category: 'texturas', repeat: 2, stagger: false,
    fn: (x, y) => 0.5 + 0.5 * Math.cos(TWO_PI * (x + 0.2 * Math.sin(TWO_PI * y))) },
  { id: 'plissado', label: 'Plissado', category: 'texturas', repeat: 2, stagger: false,
    fn: (x) => 1 - Math.abs(2 * x) },

  { id: 'circulos', label: 'Círculos', category: 'formas', repeat: 1, stagger: true,
    fn: (x, y) => soft(circle(x, y, 0, 0, 0.3)) },
  { id: 'triangulos', label: 'Triângulos', category: 'formas', repeat: 1, stagger: true,
    fn: (x, y) => soft(triangle(x, y, -0.32, -0.26, 0.32, -0.26, 0, 0.32)) },
  { id: 'quadrados', label: 'Quadrados', category: 'formas', repeat: 1, stagger: true,
    fn: (x, y) => soft(box(x, y, 0, 0, 0.22, 0.22) - 0.05) },
  { id: 'losangos', label: 'Losangos', category: 'formas', repeat: 1, stagger: true,
    fn: (x, y) => soft(Math.abs(x) + Math.abs(y) - 0.4) },
  { id: 'estrelas', label: 'Estrelas', category: 'formas', repeat: 1, stagger: true,
    fn: (x, y) => soft(star(x, y, 0.4, 0.17)) },
  { id: 'coracoes', label: 'Corações', category: 'formas', repeat: 1, stagger: true,
    fn: (x, y) => soft(heart(x, y)) },

  { id: 'margarida', label: 'Margarida', category: 'flores', repeat: 1, stagger: true,
    fn: (x, y) => {
      const r = Math.hypot(x, y);
      const petals = soft(r - (0.12 + 0.3 * Math.pow(Math.abs(Math.cos(4 * Math.atan2(y, x))), 2.5)));
      return petals * (1 - 0.6 * soft(r - 0.09));
    } },
  { id: 'flor', label: 'Flor', category: 'flores', repeat: 1, stagger: true,
    fn: (x, y) => {
      const r = Math.hypot(x, y);
      const petals = soft(r - (0.1 + 0.3 * Math.abs(Math.cos(2.5 * Math.atan2(y, x)))));
      return petals * (1 - 0.6 * soft(r - 0.07));
    } },
  { id: 'girassol', label: 'Girassol', category: 'flores', repeat: 1, stagger: true,
    fn: (x, y) => {
      const r = Math.hypot(x, y);
      const petals = soft(r - (0.15 + 0.25 * Math.pow(Math.abs(Math.cos(6 * Math.atan2(y, x))), 1.3)));
      return petals * (1 - 0.45 * soft(r - 0.13));
    } },
  { id: 'tulipa', label: 'Tulipa', category: 'flores', repeat: 1, stagger: true,
    fn: (x, y) => {
      const bloom = Math.min(
        ellipse(x, y, 0, 0.16, 0.1, 0.22),
        ellipse(x, y, -0.13, 0.11, 0.09, 0.19),
        ellipse(x, y, 0.13, 0.11, 0.09, 0.19),
        ellipse(x, y, 0, 0.06, 0.2, 0.14),
      );
      const stem = box(x, y, 0, -0.27, 0.022, 0.2);
      const leaf = ellipse(x, y, 0.12, -0.3, 0.1, 0.045);
      return soft(Math.min(bloom, stem, leaf));
    } },
  { id: 'trevo', label: 'Trevo', category: 'flores', repeat: 1, stagger: true,
    fn: (x, y) => {
      const leaves = Math.min(
        circle(x, y, -0.11, 0.11, 0.14),
        circle(x, y, 0.11, 0.11, 0.14),
        circle(x, y, -0.11, -0.11, 0.14),
        circle(x, y, 0.11, -0.11, 0.14),
      );
      return soft(Math.min(leaves, box(x, y, 0.02, -0.3, 0.02, 0.12)));
    } },
  { id: 'folha', label: 'Folha', category: 'flores', repeat: 1, stagger: true,
    fn: (x, y) => {
      const lens = Math.max(circle(x, y, -0.25, 0, 0.45), circle(x, y, 0.25, 0, 0.45));
      const shape = soft(Math.min(lens, box(x, y, 0, -0.42, 0.014, 0.07)));
      return shape * (1 - 0.6 * soft(Math.abs(x) - 0.012) * soft(Math.abs(y) - 0.33));
    } },

  { id: 'gato', label: 'Gato', category: 'animais', repeat: 1, stagger: true,
    fn: (x, y) => {
      const body = Math.min(
        circle(x, y, 0, -0.06, 0.27),
        triangle(x, y, -0.27, 0.06, -0.24, 0.4, -0.04, 0.2),
        triangle(x, y, 0.27, 0.06, 0.24, 0.4, 0.04, 0.2),
      );
      const eyes = Math.min(circle(x, y, -0.1, -0.02, 0.04), circle(x, y, 0.1, -0.02, 0.04));
      return soft(body) * (1 - soft(eyes));
    } },
  { id: 'peixe', label: 'Peixe', category: 'animais', repeat: 1, stagger: true,
    fn: (x, y) => {
      const body = Math.min(ellipse(x, y, -0.06, 0, 0.32, 0.18), triangle(x, y, 0.18, 0, 0.44, 0.2, 0.44, -0.2));
      return soft(body) * (1 - soft(circle(x, y, -0.22, 0.05, 0.035)));
    } },
  { id: 'passaro', label: 'Pássaro', category: 'animais', repeat: 1, stagger: true,
    fn: (x, y) => {
      const body = Math.min(
        ellipse(x, y, 0.02, -0.06, 0.23, 0.15),
        circle(x, y, -0.2, 0.08, 0.1),
        triangle(x, y, -0.29, 0.11, -0.44, 0.06, -0.29, 0.03),
        triangle(x, y, 0.16, -0.03, 0.44, 0.08, 0.3, -0.14),
      );
      return soft(body) * (1 - soft(circle(x, y, -0.22, 0.1, 0.025)));
    } },
  { id: 'coelho', label: 'Coelho', category: 'animais', repeat: 1, stagger: true,
    fn: (x, y) => {
      const body = Math.min(
        circle(x, y, 0, -0.12, 0.2),
        ellipse(x, y, -0.09, 0.2, 0.06, 0.2),
        ellipse(x, y, 0.09, 0.2, 0.06, 0.2),
      );
      const eyes = Math.min(circle(x, y, -0.07, -0.1, 0.03), circle(x, y, 0.07, -0.1, 0.03));
      return soft(body) * (1 - soft(eyes));
    } },
  { id: 'tartaruga', label: 'Tartaruga', category: 'animais', repeat: 1, stagger: true,
    fn: (x, y) => {
      const shell = ellipse(x, y, -0.04, 0, 0.26, 0.2);
      const body = Math.min(
        shell,
        circle(x, y, 0.27, 0.03, 0.08),
        circle(x, y, -0.2, -0.2, 0.06),
        circle(x, y, 0.1, -0.2, 0.06),
        circle(x, y, -0.2, 0.2, 0.06),
        circle(x, y, 0.1, 0.2, 0.06),
        triangle(x, y, -0.3, -0.01, -0.42, 0.03, -0.3, 0.05),
      );
      const lines = Math.max(soft(Math.abs(x + 0.04) - 0.012), soft(Math.abs(y) - 0.012));
      return soft(body) * (1 - 0.5 * soft(shell) * lines);
    } },
  { id: 'coruja', label: 'Coruja', category: 'animais', repeat: 1, stagger: true,
    fn: (x, y) => {
      const body = Math.min(
        ellipse(x, y, 0, -0.06, 0.26, 0.32),
        triangle(x, y, -0.24, 0.2, -0.2, 0.42, -0.06, 0.27),
        triangle(x, y, 0.24, 0.2, 0.2, 0.42, 0.06, 0.27),
      );
      const eyes = Math.min(circle(x, y, -0.11, 0.08, 0.09), circle(x, y, 0.11, 0.08, 0.09));
      const pupils = Math.min(circle(x, y, -0.11, 0.08, 0.035), circle(x, y, 0.11, 0.08, 0.035));
      const beak = soft(triangle(x, y, -0.035, 0, 0.035, 0, 0, -0.08));
      return Math.max(soft(body) * (1 - 0.6 * soft(eyes) + 0.6 * soft(pupils)), beak);
    } },

  { id: 'borboleta', label: 'Borboleta', category: 'bichos', repeat: 1, stagger: true,
    fn: (x, y) => {
      const wings = Math.min(
        ellipse(x, y, -0.2, 0.12, 0.18, 0.2),
        ellipse(x, y, 0.2, 0.12, 0.18, 0.2),
        ellipse(x, y, -0.15, -0.17, 0.12, 0.15),
        ellipse(x, y, 0.15, -0.17, 0.12, 0.15),
      );
      return Math.max(0.7 * soft(wings), soft(ellipse(x, y, 0, 0, 0.03, 0.26)));
    } },
  { id: 'abelha', label: 'Abelha', category: 'bichos', repeat: 1, stagger: true,
    fn: (x, y) => {
      const body = Math.min(
        ellipse(x, y, 0, 0, 0.2, 0.14),
        circle(x, y, -0.23, 0, 0.08),
        triangle(x, y, 0.19, 0.03, 0.31, 0, 0.19, -0.03),
      );
      const stripes = Math.max(soft(Math.abs(x + 0.03) - 0.028), soft(Math.abs(x - 0.09) - 0.028));
      const wings = Math.min(ellipse(x, y, -0.05, 0.19, 0.08, 0.11), ellipse(x, y, 0.07, 0.19, 0.08, 0.11));
      return Math.max(soft(body) * (1 - 0.55 * stripes), 0.6 * soft(wings));
    } },
  { id: 'joaninha', label: 'Joaninha', category: 'bichos', repeat: 1, stagger: true,
    fn: (x, y) => {
      const shell = circle(x, y, 0, -0.05, 0.25);
      const spots = Math.min(
        circle(x, y, -0.1, 0, 0.05),
        circle(x, y, 0.1, 0, 0.05),
        circle(x, y, -0.08, -0.15, 0.045),
        circle(x, y, 0.08, -0.15, 0.045),
      );
      const split = soft(Math.abs(x) - 0.01) * soft(y - 0.15);
      return soft(Math.min(shell, circle(x, y, 0, 0.23, 0.09))) * (1 - 0.6 * soft(spots)) * (1 - 0.5 * split);
    } },
  { id: 'caracol', label: 'Caracol', category: 'bichos', repeat: 1, stagger: true,
    fn: (x, y) => {
      const ring = Math.hypot(x - 0.06, y - 0.04);
      const shell = soft(circle(x, y, 0.06, 0.04, 0.24))
        * (1 - 0.6 * soft(Math.abs(ring - 0.14) - 0.018))
        * (1 - 0.6 * soft(Math.abs(ring - 0.07) - 0.018));
      const body = soft(Math.min(
        ellipse(x, y, -0.05, -0.2, 0.35, 0.08),
        circle(x, y, -0.33, -0.12, 0.07),
        ellipse(x, y, -0.36, -0.02, 0.015, 0.07),
      ));
      return Math.max(shell, 0.85 * body);
    } },

  { id: 'papoula', label: 'Papoula', category: 'silhuetas', repeat: 1, stagger: true,
    fn: (x, y) => {
      const bloom = Math.min(
        ellipse(x, y, -0.11, 0.2, 0.13, 0.15),
        ellipse(x, y, 0.11, 0.2, 0.13, 0.15),
        ellipse(x, y, -0.06, 0.1, 0.12, 0.1),
        ellipse(x, y, 0.06, 0.1, 0.12, 0.1),
      );
      const d = Math.min(bloom, stroke(x, y, POPPY_STEM, 0.07), leafSet(x, y, POPPY_LEAVES));
      return soft(d) * (1 - 0.5 * soft(circle(x, y, 0, 0.17, 0.05)));
    } },
  { id: 'lotus', label: 'Lótus', category: 'silhuetas', repeat: 1, stagger: true,
    fn: (x, y) => soft(Math.min(leafSet(x, y, LOTUS), ellipse(x, y, 0, -0.32, 0.28, 0.05))) },
  { id: 'rosa', label: 'Rosa', category: 'silhuetas', repeat: 1, stagger: true,
    fn: (x, y) => {
      const bloom = circle(x, y, 0, 0.1, 0.26);
      const d = Math.min(bloom, stroke(x, y, ROSE_STEM, 0.07), leafSet(x, y, ROSE_LEAVES));
      return soft(d) * (1 - 0.6 * soft(stroke(x, y, ROSE_SPIRAL, 0.05)) * soft(bloom));
    } },
  { id: 'lavanda', label: 'Lavanda', category: 'silhuetas', repeat: 1, stagger: true,
    fn: (x, y) => {
      let d = Math.min(stroke(x, y, LAVENDER_STEM, 0.05), leafSet(x, y, LAVENDER_LEAVES));
      for (const [cx, cy, a, b] of LAVENDER_BUDS) d = Math.min(d, ellipse(x, y, cx, cy, a, b));
      return soft(d);
    } },
  { id: 'ramo', label: 'Ramo', category: 'silhuetas', repeat: 1, stagger: true,
    fn: (x, y) => soft(Math.min(stroke(x, y, BRANCH_STEM, 0.06), leafSet(x, y, BRANCH_LEAVES))) },
  { id: 'ramalhete', label: 'Ramalhete', category: 'silhuetas', repeat: 1, stagger: true,
    fn: (x, y) => {
      let d = leafSet(x, y, BOUQUET_LEAVES);
      let hole = Infinity;
      for (const [cx, cy] of BOUQUET_FLOWERS) {
        d = Math.min(d, flower(x, y, cx, cy, 0.14, 5), stroke(x, y, [[0, -0.45], [cx, cy]], 0.05));
        hole = Math.min(hole, circle(x, y, cx, cy, 0.03));
      }
      return soft(d) * (1 - 0.5 * soft(hole));
    } },
  { id: 'samambaia', label: 'Samambaia', category: 'silhuetas', repeat: 1, stagger: true,
    fn: (x, y) => soft(Math.min(stroke(x, y, FERN_STEM, 0.05), leafSet(x, y, FERN_LEAVES))) },

  { id: 'espiral', label: 'Espiral', category: 'arabescos', repeat: 1, stagger: true,
    fn: (x, y) => {
      const end = CURL[CURL.length - 1];
      return soft(Math.min(
        stroke(x, y, CURL, 0.07),
        stroke(x, y, CURL_TAIL, 0.07),
        leafSet(x, y, CURL_LEAVES),
        circle(x, y, end[0], end[1], 0.06),
      ));
    } },
  { id: 'arabesco', label: 'Arabesco', category: 'arabescos', repeat: 1, stagger: true,
    fn: (x, y) => soft(Math.min(
      stroke(x, y, SCROLL, 0.07),
      leafSet(x, y, SCROLL_LEAVES),
      circle(x, y, SCROLL_BUDS[0][0], SCROLL_BUDS[0][1], 0.06),
      circle(x, y, SCROLL_BUDS[1][0], SCROLL_BUDS[1][1], 0.06),
    )) },
  { id: 'videira', label: 'Videira', category: 'arabescos', repeat: 2, stagger: false,
    fn: (x, y) => soft(Math.min(
      stroke(x, y, VINE, 0.07),
      leafSet(x, y, VINE_LEAVES),
      circle(x, y, 0, 0.2, 0.05),
      circle(x, y, 0, -0.2, 0.05),
    )) },
  { id: 'jacobeia', label: 'Jacobeia', category: 'arabescos', repeat: 1, stagger: true,
    fn: (x, y) => {
      const d = Math.min(stroke(x, y, JACOB_STEM, 0.07), flower(x, y, 0.02, 0.22, 0.2, 6), leafSet(x, y, JACOB_LEAVES));
      return soft(d) * (1 - 0.5 * soft(circle(x, y, 0.02, 0.22, 0.05)));
    } },
  { id: 'medalhao', label: 'Medalhão', category: 'arabescos', repeat: 1, stagger: true,
    fn: (x, y) => {
      const d = Math.min(leafSet(x, y, WREATH), flower(x, y, 0, 0, 0.13, 6));
      return soft(d) * (1 - 0.5 * soft(circle(x, y, 0, 0, 0.04)));
    } },
] as const satisfies readonly Definition[];

export type TextureId = (typeof DEFS)[number]['id'];
export type Pattern = 'nenhum' | 'imagem' | TextureId;

const BY_ID = new Map<string, Definition>(DEFS.map((item): [string, Definition] => [item.id, item]));

export function texturesFor(category: TextureCategory) {
  return DEFS.filter((item) => item.category === category);
}

export function textureLabel(pattern: Pattern) {
  if (pattern === 'imagem') return 'Sua imagem';
  return BY_ID.get(pattern)?.label ?? '';
}

// --- Image texture: dark areas (or opaque pixels) become relief.
const IMAGE_SIZE = 384;
let imageBase: Float32Array | null = null;
let imageMap: Float32Array | null = null;
let imageRadius = 0;

export const hasImageTexture = () => imageBase !== null;

// Separable max filter: thin line art needs thicker strokes to be resolved by the mesh and the clay.
function thicken(source: Float32Array, radius: number) {
  const horizontal = new Float32Array(source.length);
  const result = new Float32Array(source.length);
  for (let y = 0; y < IMAGE_SIZE; y++) {
    for (let x = 0; x < IMAGE_SIZE; x++) {
      let best = 0;
      for (let k = Math.max(0, x - radius); k <= Math.min(IMAGE_SIZE - 1, x + radius); k++) {
        best = Math.max(best, source[y * IMAGE_SIZE + k]);
      }
      horizontal[y * IMAGE_SIZE + x] = best;
    }
  }
  for (let y = 0; y < IMAGE_SIZE; y++) {
    for (let x = 0; x < IMAGE_SIZE; x++) {
      let best = 0;
      for (let k = Math.max(0, y - radius); k <= Math.min(IMAGE_SIZE - 1, y + radius); k++) {
        best = Math.max(best, horizontal[k * IMAGE_SIZE + x]);
      }
      result[y * IMAGE_SIZE + x] = best;
    }
  }
  return result;
}

export function setImageThickness(radius: number) {
  if (!imageBase || radius === imageRadius) return;
  imageRadius = radius;
  imageMap = radius > 0 ? thicken(imageBase, radius) : imageBase;
}

export async function loadImageTexture(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.');
  if (file.size > 8 * 1024 * 1024) throw new Error('A imagem deve ter até 8 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      element.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = IMAGE_SIZE;
    canvas.height = IMAGE_SIZE;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Não foi possível processar a imagem.');
    const sourceWidth = image.naturalWidth || 256;
    const sourceHeight = image.naturalHeight || 256;
    const scale = Math.min(IMAGE_SIZE / sourceWidth, IMAGE_SIZE / sourceHeight);
    const width = sourceWidth * scale;
    const height = sourceHeight * scale;
    context.drawImage(image, (IMAGE_SIZE - width) / 2, (IMAGE_SIZE - height) / 2, width, height);
    const pixels = context.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE).data;
    const map = new Float32Array(IMAGE_SIZE * IMAGE_SIZE);
    for (let i = 0; i < map.length; i++) {
      const alpha = pixels[i * 4 + 3] / 255;
      const luminance = (0.299 * pixels[i * 4] + 0.587 * pixels[i * 4 + 1] + 0.114 * pixels[i * 4 + 2]) / 255;
      map[i] = smoothstep(alpha * (1 - luminance));
    }
    imageBase = map;
    imageMap = map;
    imageRadius = 0;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Renders a line of text as the single-motif image texture (raised letters).
export function loadTextTexture(text: string) {
  const canvas = document.createElement('canvas');
  canvas.width = IMAGE_SIZE;
  canvas.height = IMAGE_SIZE;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Não foi possível processar o texto.');
  const family = '"Avenir Next", "Trebuchet MS", Arial, sans-serif';
  context.font = `800 100px ${family}`;
  const fit = Math.min(1.6, (IMAGE_SIZE * 0.94) / Math.max(1, context.measureText(text).width));
  context.font = `800 ${Math.round(100 * fit)}px ${family}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#000';
  context.fillText(text, IMAGE_SIZE / 2, IMAGE_SIZE / 2);
  const pixels = context.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE).data;
  const map = new Float32Array(IMAGE_SIZE * IMAGE_SIZE);
  for (let i = 0; i < map.length; i++) map[i] = smoothstep(pixels[i * 4 + 3] / 255);
  imageBase = map;
  imageMap = map;
  imageRadius = 0;
}

function imageHeight(x: number, y: number, invert: boolean, source: Float32Array | null = imageMap) {
  if (!source) return 0;
  const fx = clamp01(x + 0.5) * (IMAGE_SIZE - 1);
  const fy = clamp01(0.5 - y) * (IMAGE_SIZE - 1);
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(IMAGE_SIZE - 1, x0 + 1);
  const y1 = Math.min(IMAGE_SIZE - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const top = source[y0 * IMAGE_SIZE + x0] * (1 - tx) + source[y0 * IMAGE_SIZE + x1] * tx;
  const bottom = source[y1 * IMAGE_SIZE + x0] * (1 - tx) + source[y1 * IMAGE_SIZE + x1] * tx;
  const value = top * (1 - ty) + bottom * ty;
  return invert ? 1 - value : value;
}

// --- Thumbnails drawn from the same functions used on the vessel.
const BACKGROUND = [241, 239, 230];
const INK = [66, 102, 85];
const thumbnails = new Map<string, string>();

function paint(size: number, sample: (x: number, y: number) => number) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return '';
  const data = context.createImageData(size, size);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const h = clamp01(sample(i / (size - 1) - 0.5, 0.5 - j / (size - 1)));
      const offset = (j * size + i) * 4;
      for (let c = 0; c < 3; c++) data.data[offset + c] = BACKGROUND[c] + (INK[c] - BACKGROUND[c]) * h;
      data.data[offset + 3] = 255;
    }
  }
  context.putImageData(data, 0, 0);
  return canvas.toDataURL();
}

export function textureThumbnail(pattern: Pattern) {
  const cached = thumbnails.get(pattern);
  if (cached) return cached;
  const item = BY_ID.get(pattern);
  if (!item) return '';
  const url = paint(72, (x, y) => {
    const tx = x * item.repeat;
    const ty = y * item.repeat;
    return item.fn(tx - Math.round(tx), ty - Math.round(ty));
  });
  thumbnails.set(pattern, url);
  return url;
}

export const imageThumbnail = () => (imageBase ? paint(72, (x, y) => imageHeight(x, y, false, imageBase)) : '');

// phi is the angle around the vessel axis; tile centers sit at phi = 0, so motifs face the viewer.
export function patternHeight(pattern: Pattern, phi: number, y: number, grid: PatternGrid) {
  const v = (y - grid.y0) / grid.pitch;
  if (v < 0 || v >= grid.rows) return 0;
  const row = Math.floor(v);
  const item = BY_ID.get(pattern);
  const stagger = !grid.single && item?.stagger ? (row % 2) * 0.5 : 0;
  const u = (phi / TWO_PI) * grid.tiles + stagger;
  if (grid.single && Math.abs(u) > 0.5) return 0;
  const x = u - Math.round(u);
  const localY = v - row - 0.5;
  if (pattern === 'imagem') return imageHeight(x, localY, grid.invert);
  return item ? item.fn(x, localY) : 0;
}

const FACE_EDGE = 0.02;
const crisp = (distance: number) => smoothstep(0.5 - distance / (2 * FACE_EDGE));

// Cat face as grooves: u and v are mm from the face center (arc length and height), r is the head radius in mm.
export function catFaceHeight(u: number, v: number, r: number) {
  const x = u / (r * 0.85);
  const y = v / (r * 0.85);
  const eye = (side: number) => {
    const cx = side * 0.36;
    const cy = 0.05;
    return Math.max(Math.abs(Math.hypot(x - cx, y - cy) - 0.17) - 0.03, cy - y);
  };
  const smile = (side: number) => {
    const cx = side * 0.075;
    const cy = -0.13;
    return Math.max(Math.abs(Math.hypot(x - cx, y - cy) - 0.075) - 0.025, y - cy);
  };
  const distance = Math.min(
    eye(-1),
    eye(1),
    triangle(x, y, -0.07, 0, 0.07, 0, 0, -0.07),
    box(x, y, 0, -0.1, 0.02, 0.035),
    smile(-1),
    smile(1),
  );
  return crisp(distance);
}
