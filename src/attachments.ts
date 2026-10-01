import * as THREE from 'three';

const RAD = Math.PI / 180;

export type HandleStyle = 'nenhuma' | 'alca' | 'argola' | 'perolas' | 'trancada' | 'cauda' | 'pata' | 'cabo';

export const HANDLE_STYLES: { id: HandleStyle; label: string }[] = [
  { id: 'nenhuma', label: 'Nenhuma' },
  { id: 'alca', label: 'Clássica' },
  { id: 'argola', label: 'Argola' },
  { id: 'perolas', label: 'Pérolas' },
  { id: 'trancada', label: 'Trançada' },
  { id: 'cauda', label: 'Cauda' },
  { id: 'pata', label: 'Pata' },
  { id: 'cabo', label: 'Cabo de colher' },
];

// Attachment points on the vessel wall, in mm; the handle always lies in the split plane on the +x side.
export type Attach = { rTop: number; yTop: number; rBot: number; yBot: number; reach: number; thickness: number };

type Blob = { at: [number, number]; r: [number, number, number]; rot?: number };
type Ridges = { count: number; amplitude: number; turns: number };

export type HandlePlan = {
  spine: THREE.Curve<THREE.Vector3>;
  radius: (t: number) => number;
  ridges?: Ridges;
  beads?: { radius: number; centers: THREE.Vector3[] };
  extras: Blob[];
  length: number;
  top: { x: number; y: number; radius: number };
};

// Elliptical tube along a curve in the xy plane; with half set only z >= 0 is built (the flat side is buried in the plate).
function tubeGeometry(
  curve: THREE.Curve<THREE.Vector3>,
  options: { radius: (t: number) => number; half: boolean; ridges?: Ridges; segments?: number; sides?: number },
) {
  const segments = options.segments ?? 80;
  const sides = options.sides ?? 16;
  const span = options.half ? Math.PI : Math.PI * 2;
  const positions: number[] = [];
  const indices: number[] = [];
  const centers: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const length = Math.hypot(tangent.x, tangent.y) || 1;
    const nx = -tangent.y / length;
    const ny = tangent.x / length;
    const base = options.radius(t);
    centers.push(point);
    for (let k = 0; k <= sides; k++) {
      const angle = (k / sides) * span;
      let radius = base;
      if (options.ridges) {
        radius *= 1 + options.ridges.amplitude * Math.cos(options.ridges.count * angle + options.ridges.turns * Math.PI * 2 * t);
      }
      positions.push(point.x + radius * Math.cos(angle) * nx, point.y + radius * Math.cos(angle) * ny, point.z + radius * Math.sin(angle));
    }
  }
  const row = sides + 1;
  for (let i = 0; i < segments; i++) {
    for (let k = 0; k < sides; k++) {
      const a = i * row + k;
      const b = a + 1;
      const c = a + row + 1;
      const d = a + row;
      indices.push(a, b, d, b, c, d);
    }
  }
  const start = positions.length / 3;
  positions.push(centers[0].x, centers[0].y, centers[0].z);
  const end = start + 1;
  const last = centers[segments];
  positions.push(last.x, last.y, last.z);
  for (let k = 0; k < sides; k++) {
    indices.push(start, k + 1, k);
    indices.push(end, segments * row + k, segments * row + k + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// An ellipsoid centered on the split plane is cut in half; one offset in z is kept whole.
function ellipsoidGeometry(at: [number, number], r: [number, number, number], rot: number, z: number, cut: boolean) {
  const geometry = new THREE.SphereGeometry(1, 28, 18, 0, cut ? Math.PI : Math.PI * 2);
  geometry.scale(Math.max(r[0], 0.01), Math.max(r[1], 0.01), Math.max(r[2], 0.01));
  geometry.rotateZ(rot * RAD);
  geometry.translate(at[0], at[1], z);
  return geometry;
}

const curveThrough = (points: [number, number][]) =>
  new THREE.CatmullRomCurve3(points.map(([x, y]) => new THREE.Vector3(x, y, 0)));

function loopPoints(a: Attach): [number, number][] {
  const { rTop, yTop, rBot, yBot, reach } = a;
  return [
    [rTop - 2, yTop + 8],
    [rTop + reach * 0.65, yTop + 7],
    [rTop + reach, (yTop + yBot) * 0.64],
    [rTop + reach * 0.96, yBot + (yTop - yBot) * 0.34],
    [rBot + reach * 0.62, yBot - 7],
    [rBot - 2, yBot - 8],
  ];
}

function ringPoints(a: Attach): [number, number][] {
  const radiusX = a.reach * 0.566;
  const radiusY = (a.yTop - a.yBot) / (2 * Math.sin(140 * RAD));
  const centerX = (a.rTop + a.rBot) / 2 - 2 - Math.cos(140 * RAD) * radiusX;
  const centerY = (a.yTop + a.yBot) / 2;
  const points: [number, number][] = [];
  for (let i = 0; i <= 28; i++) {
    const angle = (140 - (280 * i) / 28) * RAD;
    const y = centerY + radiusY * Math.sin(angle);
    // Lean the ring with the body so both ends meet the wall, which is narrower at the top than at the bottom.
    const lean = ((a.rTop - a.rBot) * (y - centerY)) / (a.yTop - a.yBot);
    points.push([centerX + radiusX * Math.cos(angle) + lean, y]);
  }
  return points;
}

function planTop(plan: Omit<HandlePlan, 'top'>) {
  let best = { x: 0, y: -Infinity, radius: 0 };
  for (let i = 0; i <= 80; i++) {
    const t = i / 80;
    const p = plan.spine.getPointAt(t);
    if (p.y > best.y) best = { x: p.x, y: p.y, radius: plan.radius(t) };
  }
  for (const e of plan.extras) {
    if (e.at[1] + e.r[1] > best.y) best = { x: e.at[0], y: e.at[1] + e.r[1], radius: 0 };
  }
  return best;
}

export function handlePlan(style: Exclude<HandleStyle, 'nenhuma'>, a: Attach): HandlePlan {
  const t = a.thickness;
  const span = a.yTop - a.yBot;
  let plan: Omit<HandlePlan, 'top'>;
  if (style === 'argola' || style === 'perolas') {
    const spine = curveThrough(ringPoints(a));
    const length = spine.getLength();
    if (style === 'perolas') {
      const beadRadius = t * 1.3;
      const count = Math.max(5, Math.round(length / (beadRadius * 1.65)));
      const centers = Array.from({ length: count }, (_, i) => spine.getPointAt(i / (count - 1)));
      plan = { spine, radius: () => beadRadius * 0.45, beads: { radius: beadRadius, centers }, extras: [], length };
    } else {
      plan = { spine, radius: () => t, extras: [], length };
    }
  } else if (style === 'trancada') {
    const spine = curveThrough(loopPoints(a));
    const length = spine.getLength();
    plan = { spine, radius: () => t * 0.95, ridges: { count: 3, amplitude: 0.22, turns: length / (t * 3.2) }, extras: [], length };
  } else if (style === 'cauda') {
    const { rTop, rBot, yTop, yBot, reach: R } = a;
    const spine = curveThrough([
      [rBot - 2, yBot],
      [rBot + 0.55 * R, yBot - 0.04 * span],
      [rBot + 1.0 * R, yBot + 0.28 * span],
      [rTop + 0.8 * R, yTop + 0.02 * span],
      [rTop + 0.55 * R, yTop + 0.22 * span],
      [rTop + 0.72 * R, yTop + 0.38 * span],
      [rTop + 1.08 * R, yTop + 0.33 * span],
    ]);
    const end = spine.getPointAt(1);
    const tip = t * 0.55;
    plan = {
      spine,
      radius: (u) => t * (1 - 0.45 * Math.pow(u, 1.2)),
      extras: [{ at: [end.x, end.y], r: [tip, tip, tip] }],
      length: spine.getLength(),
    };
  } else if (style === 'pata') {
    const { rTop, rBot, yTop, yBot, reach: R } = a;
    const spine = curveThrough([
      [rBot - 2, yBot],
      [rBot + 0.6 * R, yBot - 0.03 * span],
      [rBot + 0.95 * R, yBot + 0.35 * span],
      [rTop + 0.8 * R, yTop + 0.08 * span],
    ]);
    const end = spine.getPointAt(1);
    const toe = t * 0.75;
    plan = {
      spine,
      radius: () => t * 0.9,
      extras: [
        { at: [end.x, end.y + t * 0.9], r: [t * 1.9, t * 1.6, t * 1.3] },
        { at: [end.x - t * 1.25, end.y + t * 2.5], r: [toe, toe, toe] },
        { at: [end.x, end.y + t * 2.95], r: [toe, toe, toe] },
        { at: [end.x + t * 1.25, end.y + t * 2.5], r: [toe, toe, toe] },
      ],
      length: spine.getLength(),
    };
  } else if (style === 'cabo') {
    const { rTop, yTop, reach: R } = a;
    const spine = curveThrough([
      [rTop - 2, yTop],
      [rTop + R * 0.35, yTop + t * 0.2],
      [rTop + R * 0.7, yTop + t * 0.7],
      [rTop + R, yTop + t * 1.2],
    ]);
    const leaf = spine.getPointAt(0.45);
    const end = spine.getPointAt(1);
    plan = {
      spine,
      radius: (u) => t * (0.8 + 0.2 * u),
      extras: [
        { at: [leaf.x, leaf.y + t * 1.2], r: [t * 2.4, t * 0.85, t * 0.7], rot: 38 },
        { at: [leaf.x, leaf.y - t * 1.2], r: [t * 2.4, t * 0.85, t * 0.7], rot: -38 },
        { at: [end.x, end.y], r: [t * 1.7, t * 1.3, t * 1.1] },
      ],
      length: spine.getLength(),
    };
  } else {
    const spine = curveThrough(loopPoints(a));
    plan = { spine, radius: () => t, extras: [], length: spine.getLength() };
  }
  return { ...plan, top: planTop(plan) };
}

// A tube following a free path in the split plane (used for teapot spouts).
export function tubePlan(points: [number, number][], radius: (t: number) => number): HandlePlan {
  const spine = curveThrough(points);
  const plan = { spine, radius, extras: [], length: spine.getLength() };
  return { ...plan, top: planTop(plan) };
}

export function handleGeometries(plan: HandlePlan, half: boolean) {
  const geometries: THREE.BufferGeometry[] = [
    tubeGeometry(plan.spine, { radius: plan.radius, half, ridges: plan.ridges }),
  ];
  for (const center of plan.beads?.centers ?? []) {
    const r = plan.beads!.radius;
    geometries.push(ellipsoidGeometry([center.x, center.y], [r, r, r], 0, 0, half));
  }
  for (const e of plan.extras) geometries.push(ellipsoidGeometry(e.at, e.r, e.rot ?? 0, 0, half));
  return geometries;
}

// Ring of flat leaves radiating from under the base; in a half piece only the leaves on z >= 0 are kept.
export function leafRingGeometries(count: number, baseRadius: number, half: boolean) {
  const geometries: THREE.BufferGeometry[] = [];
  const a = baseRadius * 1.05;
  const b = Math.max(1.2, baseRadius * 0.1);
  const w = a * 0.3;
  const center = baseRadius * 1.1;
  for (let i = 0; i < count; i++) {
    const theta = (i * 2 * Math.PI) / count;
    const s = Math.sin(theta);
    const c = Math.cos(theta);
    if (half && c < -0.01) continue;
    if (half && Math.abs(c) <= 0.01) {
      geometries.push(ellipsoidGeometry([Math.sign(s) * center, b * 0.9], [a, b, w], 0, 0, true));
      continue;
    }
    const geometry = new THREE.SphereGeometry(1, 20, 12);
    geometry.scale(a, b, w);
    geometry.rotateY(theta - Math.PI / 2);
    geometry.translate(s * center, b * 0.9, c * center);
    geometries.push(geometry);
  }
  return geometries;
}

export type RimSpout = 'labio' | 'arredondado' | 'bico';

// One spout on the -x side of the rim; cut keeps only z >= 0 (a spout lying in the split plane).
function singleSpout(kind: RimSpout, rimRadius: number, rimY: number, scale: number, width: number, cut: boolean) {
  const s = rimRadius * 0.45 * scale;
  if (kind === 'bico') {
    // A pointed beak: a cone that rises outward from the rim.
    const radius = rimRadius * 0.2 * scale * width;
    const length = rimRadius * 0.95 * scale;
    const angle = 24 * RAD;
    const dx = -Math.cos(angle);
    const dy = Math.sin(angle);
    const baseX = -rimRadius * 0.9;
    const baseY = rimY - radius * 0.8;
    const geometry = new THREE.ConeGeometry(radius, length, 28, 1, false, -Math.PI / 2, cut ? Math.PI : Math.PI * 2);
    geometry.rotateZ(Math.PI / 2 - angle);
    geometry.translate(baseX + (dx * length) / 2, baseY + (dy * length) / 2, 0);
    return geometry;
  }
  if (kind === 'arredondado') {
    return ellipsoidGeometry([-(rimRadius + s * 0.4), rimY - s * 0.2], [s * 1.25, s * 0.45, s * 0.85 * width], -16, 0, cut);
  }
  return ellipsoidGeometry([-(rimRadius + s * 0.35), rimY - s * 0.2], [s * 0.8, s * 0.32, s * 0.5 * width], -14, 0, cut);
}

// Spouts spread evenly around the rim from position (degrees; 0 = opposite to the handle). In a half piece only those with z >= 0 are kept.
export function spoutGeometries(kind: RimSpout, rimRadius: number, rimY: number, scale: number, width: number, count: number, position: number, half: boolean) {
  const geometries: THREE.BufferGeometry[] = [];
  for (let i = 0; i < count; i++) {
    const theta = (position * RAD) + (i * 2 * Math.PI) / count;
    const s = Math.sin(theta);
    if (half && s < -0.01) continue;
    if (Math.abs(s) <= 0.01) {
      geometries.push(singleSpout(kind, rimRadius, rimY, scale, width, half));
      continue;
    }
    const geometry = singleSpout(kind, rimRadius, rimY, scale, width, false);
    geometry.rotateY(theta);
    geometries.push(geometry);
  }
  return geometries;
}

// --- Objects applied to the vessel. Coordinates are in units of half the object size, y up, facing +x.
export type FigurePlace = 'borda' | 'alca' | 'frente';

type Part = { kind: 'e'; at: [number, number]; r: [number, number, number]; rot?: number; z?: number };
type Limb = { kind: 'l'; path: [number, number][]; r0: number; r1: number; z?: number };

// split: lies on the split plane (each mold half holds half of it); front: a relief on the front of the body.
export type FigureDef = {
  id: string;
  label: string;
  place: 'split' | 'front';
  base: number;
  onRim?: boolean;
  parts: (Part | Limb)[];
};

const e = (at: [number, number], r: [number, number, number], rot = 0, z = 0): Part => ({ kind: 'e', at, r, rot, z });
const l = (path: [number, number][], r0: number, r1: number, z = 0): Limb => ({ kind: 'l', path, r0, r1, z });

export const FIGURES: FigureDef[] = [
  { id: 'passaro', label: 'Pássaro', place: 'split', base: -0.42, parts: [
    e([0, 0], [0.62, 0.42, 0.38]),
    e([0.5, 0.22], [0.3, 0.28, 0.27]),
    e([-0.08, 0.06], [0.4, 0.17, 0.2], -18, 0.22),
    e([0.62, 0.3], [0.06, 0.06, 0.06], 0, 0.24),
    l([[-0.5, 0.02], [-1.0, 0.3]], 0.17, 0.07),
    l([[0.76, 0.22], [1.02, 0.17]], 0.1, 0.03),
  ] },
  { id: 'abelha', label: 'Abelha', place: 'split', base: -0.4, parts: [
    e([0, 0], [0.62, 0.42, 0.4]),
    e([0.62, 0.05], [0.28, 0.26, 0.26]),
    e([-0.12, 0.5], [0.3, 0.2, 0.08], 20),
    e([0.12, 0.52], [0.28, 0.18, 0.08], -10),
    l([[-0.6, 0], [-0.88, -0.05]], 0.1, 0.03),
    l([[0.8, 0.25], [0.95, 0.5]], 0.03, 0.03),
  ] },
  { id: 'borboleta', label: 'Borboleta', place: 'split', base: -0.55, parts: [
    e([0, 0], [0.07, 0.55, 0.1]),
    e([-0.48, 0.3], [0.5, 0.4, 0.06], 20),
    e([0.48, 0.3], [0.5, 0.4, 0.06], -20),
    e([-0.36, -0.25], [0.36, 0.3, 0.06], -15),
    e([0.36, -0.25], [0.36, 0.3, 0.06], 15),
    l([[0, 0.5], [-0.2, 0.9]], 0.03, 0.03),
    l([[0, 0.5], [0.2, 0.9]], 0.03, 0.03),
  ] },
  { id: 'libelula', label: 'Libélula', place: 'split', base: -0.1, parts: [
    l([[-1, 0], [0.85, 0]], 0.09, 0.07),
    e([0.95, 0], [0.13, 0.13, 0.13]),
    e([0.1, 0.34], [0.55, 0.12, 0.05], 8),
    e([-0.35, 0.36], [0.5, 0.11, 0.05], -4),
    e([0.1, -0.34], [0.55, 0.12, 0.05], -8),
    e([-0.35, -0.36], [0.5, 0.11, 0.05], 4),
  ] },
  { id: 'gatinho', label: 'Gatinho', place: 'split', base: -0.38, parts: [
    l([[-0.7, 0], [0.4, 0]], 0.34, 0.38),
    e([0.72, 0.02], [0.3, 0.27, 0.26]),
    e([0.7, 0.3], [0.1, 0.2, 0.07], -8, 0.17),
    l([[-0.7, 0.05], [-1.1, 0.25], [-1.25, 0.55]], 0.13, 0.07),
    l([[0.4, -0.1], [0.5, -0.75]], 0.13, 0.1, 0.2),
    l([[-0.4, -0.1], [-0.35, -0.6]], 0.15, 0.1, 0.22),
    e([0.5, -0.8], [0.16, 0.1, 0.12], 0, 0.2),
  ] },
  { id: 'campanula', label: 'Campânula', place: 'split', base: -0.9, parts: [
    l([[-0.15, -0.9], [-0.1, 0.2], [0.3, 0.65], [0.7, 0.45]], 0.09, 0.07),
    e([0.7, 0], [0.34, 0.42, 0.34]),
    e([0.7, -0.38], [0.5, 0.1, 0.5]),
  ] },
  { id: 'calla', label: 'Copo-de-leite', place: 'split', base: -1.0, parts: [
    l([[0, -1], [0, -0.2]], 0.09, 0.08),
    e([0.02, 0.35], [0.4, 0.7, 0.28], -10),
    l([[0.02, 0.15], [0.08, 0.75]], 0.07, 0.05, 0.15),
  ] },
  { id: 'flor', label: 'Flor', place: 'front', base: 0, parts: [
    ...Array.from({ length: 5 }, (_, i): Part => {
      const angle = 90 + i * 72;
      return e([Math.cos(angle * RAD) * 0.5, Math.sin(angle * RAD) * 0.5], [0.42, 0.26, 0.14], angle);
    }),
    e([0, 0], [0.28, 0.28, 0.2], 0, 0.06),
  ] },
  { id: 'peixe', label: 'Peixe', place: 'front', base: 0, parts: [
    e([-0.1, 0], [0.65, 0.32, 0.17]),
    e([0.62, 0.2], [0.3, 0.14, 0.1], 35),
    e([0.62, -0.2], [0.3, 0.14, 0.1], -35),
    e([-0.15, 0.34], [0.25, 0.1, 0.1], 20),
    e([-0.45, 0.08], [0.06, 0.06, 0.06], 0, 0.12),
  ] },
  { id: 'orelhas', label: 'Orelhas', place: 'front', base: -0.1, onRim: true, parts: [
    e([-0.55, 0.35], [0.28, 0.5, 0.14], 12),
    e([0.55, 0.35], [0.28, 0.5, 0.14], -12),
  ] },
];

export const figureById = (id: string) => FIGURES.find((item) => item.id === id);

export function figureGeometries(def: FigureDef, size: number, half: boolean) {
  const s = size / 2;
  const split = def.place === 'split';
  const mirror = split && !half;
  const geometries: THREE.BufferGeometry[] = [];
  for (const part of def.parts) {
    const offsets = part.z ? (mirror ? [part.z * s, -part.z * s] : [part.z * s]) : [0];
    for (const z of offsets) {
      const cut = split && half && z === 0;
      if (part.kind === 'e') {
        geometries.push(ellipsoidGeometry([part.at[0] * s, part.at[1] * s], [part.r[0] * s, part.r[1] * s, part.r[2] * s], part.rot ?? 0, z, cut));
        continue;
      }
      const points = part.path.map(([x, y]) => new THREE.Vector3(x * s, y * s, z));
      const curve = points.length === 2 ? new THREE.LineCurve3(points[0], points[1]) : new THREE.CatmullRomCurve3(points);
      geometries.push(tubeGeometry(curve, {
        radius: (t) => (part.r0 + (part.r1 - part.r0) * t) * s,
        half: cut,
        segments: 24,
        sides: 12,
      }));
      const first = points[0];
      const end = points[points.length - 1];
      geometries.push(ellipsoidGeometry([first.x, first.y], [part.r0 * s, part.r0 * s, part.r0 * s], 0, z, cut));
      geometries.push(ellipsoidGeometry([end.x, end.y], [part.r1 * s, part.r1 * s, part.r1 * s], 0, z, cut));
    }
  }
  return geometries;
}

// --- Thumbnails: silhouettes drawn from the same definitions.
const BACKGROUND = [241, 239, 230];
const INK = [66, 102, 85];
const WALL = [207, 210, 198];
const thumbnails = new Map<string, string>();

function paintMask(size: number, pick: (x: number, y: number) => 0 | 1 | 2) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return '';
  const data = context.createImageData(size, size);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const value = pick(i / (size - 1), 1 - j / (size - 1));
      const color = value === 1 ? INK : value === 2 ? WALL : BACKGROUND;
      const offset = (j * size + i) * 4;
      data.data[offset] = color[0];
      data.data[offset + 1] = color[1];
      data.data[offset + 2] = color[2];
      data.data[offset + 3] = 255;
    }
  }
  context.putImageData(data, 0, 0);
  return canvas.toDataURL();
}

function insideBlob(x: number, y: number, [cx, cy]: [number, number], [a, b]: [number, number, number], rot: number) {
  const dx = x - cx;
  const dy = y - cy;
  const c = Math.cos(rot * RAD);
  const sn = Math.sin(rot * RAD);
  const u = dx * c + dy * sn;
  const v = -dx * sn + dy * c;
  return (u / a) ** 2 + (v / b) ** 2 <= 1;
}

function insideLimb(x: number, y: number, path: [number, number][], r0: number, r1: number) {
  const curve = curveThrough(path);
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const p = curve.getPointAt(t);
    if (Math.hypot(x - p.x, y - p.y) <= r0 + (r1 - r0) * t) return true;
  }
  return false;
}

export function figureThumbnail(def: FigureDef) {
  const cached = thumbnails.get(def.id);
  if (cached) return cached;
  const url = paintMask(72, (u, v) => {
    const x = (u - 0.5) * 2.7;
    const y = (v - 0.5) * 2.7;
    for (const part of def.parts) {
      if (part.kind === 'e' ? insideBlob(x, y, part.at, part.r, part.rot ?? 0) : insideLimb(x, y, part.path, part.r0, part.r1)) return 1;
    }
    return 0;
  });
  thumbnails.set(def.id, url);
  return url;
}

export function handleThumbnail(style: Exclude<HandleStyle, 'nenhuma'>) {
  const key = `h-${style}`;
  const cached = thumbnails.get(key);
  if (cached) return cached;
  const plan = handlePlan(style, { rTop: 0, yTop: 78, rBot: 0, yBot: 30, reach: 34, thickness: 5.5 });
  const samples = Array.from({ length: 140 }, (_, i) => ({ p: plan.spine.getPointAt(i / 139), r: plan.radius(i / 139) }));
  const url = paintMask(72, (u, v) => {
    const x = -20 + u * 80;
    const y = -8 + v * 112;
    for (const s of samples) if (Math.hypot(x - s.p.x, y - s.p.y) <= s.r) return 1;
    for (const c of plan.beads?.centers ?? []) if (Math.hypot(x - c.x, y - c.y) <= plan.beads!.radius) return 1;
    for (const b of plan.extras) if (insideBlob(x, y, b.at, b.r, b.rot ?? 0)) return 1;
    return x <= 0 ? 2 : 0;
  });
  thumbnails.set(key, url);
  return url;
}
