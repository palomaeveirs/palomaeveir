import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Cat,
  Check,
  CircleHelp,
  Download,
  RotateCcw,
  Shapes,
  SlidersHorizontal,
  Upload,
} from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import GoogleAuth from './GoogleAuth';
import { calculateQuote, formatBRL, type Product } from './pricing';
import QRCode from 'qrcode';
import { pixPayload } from './pix';
import { PRINTER, USABLE } from './printer';
import {
  TEXTURE_CATEGORIES,
  catFaceHeight,
  hasImageTexture,
  imageThumbnail,
  loadImageTexture,
  loadTextTexture,
  patternHeight,
  setImageThickness,
  textureLabel,
  textureThumbnail,
  texturesFor,
  type Pattern,
  type PatternGrid,
  type TextureCategory,
} from './patterns';
import {
  FIGURES,
  HANDLE_STYLES,
  figureById,
  figureGeometries,
  spoutGeometries,
  tubePlan,
  leafRingGeometries,
  figureThumbnail,
  handleGeometries,
  handlePlan,
  handleThumbnail,
  type Attach,
  type FigurePlace,
  type HandleStyle,
} from './attachments';

type Form = 'jarra' | 'vaso' | 'copo' | 'gato' | 'tigela' | 'prato' | 'frasco' | 'medidor' | 'colher' | 'flor' | 'pires' | 'bule' | 'acucareiro' | 'tampa';
type CupStyle = 'conico' | 'reto' | 'baixo' | 'redondo' | 'petala' | 'tulipa' | 'aberta';
type SpoutType = 'nenhum' | 'labio' | 'arredondado' | 'bico' | 'tubo' | 'pescoco';

const SPOUTS: { id: SpoutType; label: string; text: string }[] = [
  { id: 'nenhum', label: 'Sem bocal', text: 'Borda lisa' },
  { id: 'labio', label: 'Lábio', text: 'Vertedor curto' },
  { id: 'arredondado', label: 'Arredondado', text: 'Vertedor largo' },
  { id: 'bico', label: 'Bico', text: 'Pontudo, em cone' },
  { id: 'tubo', label: 'Tubo', text: 'Sobe do corpo' },
  { id: 'pescoco', label: 'Pescoço de ganso', text: 'Longo e curvo' },
];
const NO_SPOUT: Form[] = ['gato', 'tampa', 'prato', 'pires', 'colher'];
type Mode = 'completa' | 'metade';
type Settings = {
  form: Form;
  height: number;
  base: number;
  belly: number;
  mouth: number;
  handle: number;
  handleHeight: number;
  wall: number;
  plateMargin: number;
  plateThickness: number;
  shrink: number;
  bellyPos: number;
  lip: number;
  well: number;
  plasterAbove: number;
  waterRatio: number;
  showWalls: boolean;
  pattern: Pattern;
  patternSize: number;
  patternDepth: number;
  engrave: boolean;
  patternFrom: number;
  patternTo: number;
  single: boolean;
  imageInvert: boolean;
  imageVersion: number;
  imageThickness: number;
  earHeight: number;
  earTilt: number;
  face: boolean;
  handleStyle: HandleStyle;
  handleSpan: number;
  handleThickness: number;
  handleSink: number;
  figure: string;
  figureSize: number;
  figurePlace: FigurePlace;
  figureHeight: number;
  hollow: boolean;
  shellThickness: number;
  ribSpacing: number;
  wallThickness: number;
  printWalls: boolean;
  volume: number;
  cupWall: number;
  cupStyle: CupStyle;
  spoutType: SpoutType;
  spoutSize: number;
  spoutCount: number;
  spoutWidth: number;
  spoutPos: number;
  petalFull: boolean;
  mouthStyle: MouthStyle;
  mouthBand: number;
  mouthOpen: number;
  petals: number;
  petalDepth: number;
  petalTwist: number;
  leaves: number;
  rimWave: number;
  foot: number;
};

const initialSettings: Settings = {
  form: 'jarra',
  height: 18,
  base: 8,
  belly: 13,
  mouth: 9,
  handle: 6,
  handleHeight: 76,
  wall: 5,
  plateMargin: 2,
  plateThickness: 4,
  shrink: 12,
  bellyPos: 54,
  lip: 2,
  well: 15,
  plasterAbove: 30,
  waterRatio: 70,
  showWalls: false,
  pattern: 'nenhum',
  patternSize: 20,
  patternDepth: 2,
  engrave: false,
  patternFrom: 15,
  patternTo: 85,
  single: false,
  imageInvert: false,
  imageVersion: 0,
  imageThickness: 2,
  earHeight: 5,
  earTilt: 20,
  face: true,
  handleStyle: 'alca',
  handleSpan: 42,
  handleThickness: 8,
  handleSink: 0,
  figure: 'nenhum',
  figureSize: 35,
  figurePlace: 'borda',
  figureHeight: 55,
  hollow: false,
  shellThickness: 1.6,
  ribSpacing: 40,
  wallThickness: 3,
  printWalls: false,
  volume: 240,
  cupWall: 4,
  cupStyle: 'conico',
  spoutType: 'nenhum',
  spoutSize: 100,
  spoutCount: 1,
  spoutWidth: 100,
  spoutPos: 0,
  petalFull: false,
  mouthStyle: 'liso',
  mouthBand: 20,
  mouthOpen: 30,
  petals: 0,
  petalDepth: 7,
  petalTwist: 0,
  leaves: 0,
  rimWave: 0,
  foot: 0,
};

type PresetKeys = 'height' | 'base' | 'belly' | 'mouth' | 'bellyPos' | 'handleStyle' | 'handle' | 'handleHeight' | 'handleSpan' | 'well';

const presets: Record<Form, Pick<Settings, PresetKeys>> = {
  jarra: { height: 18, base: 8, belly: 13, mouth: 9, bellyPos: 54, handleStyle: 'alca', handle: 6, handleHeight: 76, handleSpan: 42, well: 15 },
  vaso: { height: 16, base: 7, belly: 11, mouth: 8, bellyPos: 54, handleStyle: 'nenhuma', handle: 5, handleHeight: 74, handleSpan: 40, well: 15 },
  copo: { height: 12, base: 8, belly: 9, mouth: 9, bellyPos: 54, handleStyle: 'alca', handle: 4, handleHeight: 80, handleSpan: 55, well: 15 },
  gato: { height: 20, base: 12, belly: 15, mouth: 5, bellyPos: 34, handleStyle: 'cauda', handle: 5, handleHeight: 70, handleSpan: 42, well: 0 },
  tigela: { height: 8, base: 6, belly: 14, mouth: 16, bellyPos: 54, handleStyle: 'nenhuma', handle: 4, handleHeight: 80, handleSpan: 40, well: 15 },
  prato: { height: 3, base: 14, belly: 20, mouth: 20, bellyPos: 54, handleStyle: 'nenhuma', handle: 4, handleHeight: 80, handleSpan: 40, well: 10 },
  frasco: { height: 20, base: 8, belly: 10, mouth: 3, bellyPos: 38, handleStyle: 'nenhuma', handle: 4, handleHeight: 75, handleSpan: 40, well: 15 },
  medidor: { height: 7, base: 6, belly: 8, mouth: 8, bellyPos: 54, handleStyle: 'alca', handle: 4, handleHeight: 78, handleSpan: 55, well: 15 },
  colher: { height: 3, base: 3, belly: 4, mouth: 4, bellyPos: 54, handleStyle: 'cabo', handle: 9, handleHeight: 90, handleSpan: 10, well: 15 },
  flor: { height: 6, base: 4.5, belly: 10, mouth: 10, bellyPos: 54, handleStyle: 'alca', handle: 3, handleHeight: 78, handleSpan: 40, well: 15 },
  pires: { height: 2, base: 8, belly: 15, mouth: 15, bellyPos: 54, handleStyle: 'nenhuma', handle: 4, handleHeight: 80, handleSpan: 40, well: 10 },
  bule: { height: 15, base: 8, belly: 16, mouth: 8, bellyPos: 45, handleStyle: 'alca', handle: 5, handleHeight: 80, handleSpan: 52, well: 15 },
  acucareiro: { height: 9, base: 6, belly: 10, mouth: 7, bellyPos: 52, handleStyle: 'nenhuma', handle: 4, handleHeight: 75, handleSpan: 40, well: 15 },
  tampa: { height: 5, base: 8, belly: 8, mouth: 8, bellyPos: 54, handleStyle: 'nenhuma', handle: 4, handleHeight: 75, handleSpan: 40, well: 0 },
};

const isCup = (form: Form) => form === 'medidor' || form === 'colher' || form === 'flor';
const isPlate = (form: Form) => form === 'prato' || form === 'pires';

// Inner profile of a measuring cup: height/diameter ratio, base/mouth taper and the radius curve g(0..1) from base to mouth.
const CUP_STYLES: Record<CupStyle, { label: string; ratio: number; taper: number; g: (t: number) => number }> = {
  conico: { label: 'Cônico', ratio: 0.85, taper: 0.85, g: (t) => t },
  reto: { label: 'Reto (empilhável)', ratio: 0.8, taper: 1, g: (t) => t },
  baixo: { label: 'Baixo e largo', ratio: 0.42, taper: 0.7, g: (t) => Math.pow(t, 0.8) },
  redondo: { label: 'Arredondado', ratio: 0.8, taper: 0.6, g: (t) => Math.sqrt(1 - Math.pow(1 - t, 2)) },
  petala: { label: 'Flor', ratio: 0.62, taper: 0.4, g: (t) => 1 - Math.pow(1 - t, 1.8) },
  tulipa: { label: 'Tulipa', ratio: 0.85, taper: 0.35, g: (t) => 1 - Math.pow(1 - t, 2.2) },
  aberta: { label: 'Aberta', ratio: 0.45, taper: 0.28, g: (t) => Math.pow(t, 0.75) },
};

const FLOWER_STYLES: Record<string, { label: string; text: string; spec: Partial<Settings> }> = {
  delicada: { label: 'Delicada', text: 'Muitas pétalas, com folhas', spec: { cupStyle: 'petala', volume: 180, petals: 8, petalDepth: 9, petalTwist: 0, leaves: 8, rimWave: 4, foot: 0 } },
  tulipa: { label: 'Tulipa', text: 'Pétalas sobrepostas, com pé', spec: { cupStyle: 'tulipa', volume: 200, petals: 6, petalDepth: 14, petalTwist: 18, leaves: 0, rimWave: 6, foot: 12 } },
  aberta: { label: 'Aberta', text: 'Poucas pétalas largas', spec: { cupStyle: 'aberta', volume: 150, petals: 5, petalDepth: 24, petalTwist: 0, leaves: 6, rimWave: 8, foot: 0 } },
};

const MEASURES = [
  { label: 'Colher de chá', ml: 5 },
  { label: 'Colher de sobremesa', ml: 10 },
  { label: 'Colher de sopa', ml: 15 },
  { label: '1/4 xícara', ml: 60 },
  { label: '1/3 xícara', ml: 80 },
  { label: '1/2 xícara', ml: 120 },
  { label: '1 xícara', ml: 240 },
];

const SPOONS = [
  { label: '1/4 colher de chá', ml: 1.25 },
  { label: '1/2 colher de chá', ml: 2.5 },
  { label: 'Colher de chá', ml: 5 },
  { label: 'Colher de sobremesa', ml: 10 },
  { label: 'Colher de sopa', ml: 15 },
];

// Fired measuring cup or spoon bowl whose inner capacity (to the brim) equals the volume in ml.
function cupPatch(settings: Settings): Partial<Settings> {
  const style = CUP_STYLES[settings.cupStyle];
  const wall = settings.cupWall / 10;
  let integral = 0;
  for (let i = 0; i < 50; i++) {
    const r = style.taper + (1 - style.taper) * style.g((i + 0.5) / 50);
    integral += (r * r) / 50;
  }
  const inner = Math.cbrt(settings.volume / (Math.PI * 2 * style.ratio * integral));
  const round = (value: number) => Math.round(value * 100) / 100;
  const height = round(inner * 2 * style.ratio + wall + settings.foot / 10);
  const patch: Partial<Settings> = {
    height,
    base: round(2 * (inner * style.taper + wall)),
    mouth: round(2 * (inner + wall)),
    lip: 1,
  };
  if (settings.form === 'colher') {
    patch.handleThickness = 5;
  } else if (settings.form === 'flor') {
    patch.handle = 3;
    patch.handleThickness = 5;
  } else {
    patch.handle = Math.min(5, Math.max(2, round(inner * 1.1)));
    patch.handleThickness = Math.min(8, Math.max(4, Math.round(height * 1.2)));
  }
  return patch;
}

// Traditional Brazilian pottery as starting points (fired sizes in cm).
const MODELS: { id: string; label: string; text: string; form: Form; set: Partial<Settings> }[] = [
  { id: 'moringa', label: 'Moringa', text: 'Barriga redonda, gargalo', form: 'frasco', set: { height: 20, base: 8, belly: 16, mouth: 5, bellyPos: 42, mouthStyle: 'beico', mouthBand: 12, mouthOpen: 40, handleStyle: 'alca', handle: 3, handleHeight: 82, handleSpan: 40 } },
  { id: 'potedagua', label: 'Pote d’água', text: 'Boca larga, borda grossa', form: 'vaso', set: { height: 20, base: 9, belly: 17, mouth: 9, bellyPos: 50, mouthStyle: 'enrolado', mouthBand: 10 } },
  { id: 'talha', label: 'Talha', text: 'Grande e bojuda', form: 'vaso', set: { height: 20, base: 9, belly: 19, mouth: 11, bellyPos: 55, mouthStyle: 'enrolado', mouthBand: 10 } },
  { id: 'quartinha', label: 'Quartinha', text: 'Gargalo longo e fino', form: 'frasco', set: { height: 20, base: 6, belly: 12, mouth: 4, bellyPos: 30, mouthStyle: 'gargalo', mouthBand: 45 } },
  { id: 'bilha', label: 'Bilha', text: 'Redonda, boca em sino', form: 'frasco', set: { height: 18, base: 7, belly: 14, mouth: 5, bellyPos: 40, mouthStyle: 'sino', mouthBand: 35, mouthOpen: 32 } },
  { id: 'panela', label: 'Panela de barro', text: 'Funda, com alça', form: 'tigela', set: { height: 11, base: 10, mouth: 18, mouthStyle: 'enrolado', mouthBand: 10, handleStyle: 'alca', handle: 3, handleHeight: 85, handleSpan: 30 } },
  { id: 'alguidar', label: 'Alguidar', text: 'Bacia larga', form: 'tigela', set: { height: 8, base: 10, mouth: 20, mouthStyle: 'beico', mouthBand: 12, mouthOpen: 40 } },
];

const FORM_CARDS: { id: Form; label: string; text: string }[] = [
  { id: 'jarra', label: 'Jarra', text: 'Corpo redondo com alça.' },
  { id: 'vaso', label: 'Vaso', text: 'Para flores e plantas.' },
  { id: 'copo', label: 'Copo', text: 'Boca larga, com alça opcional.' },
  { id: 'tigela', label: 'Tigela', text: 'Funda e arredondada.' },
  { id: 'prato', label: 'Prato', text: 'Raso, com fundo plano.' },
  { id: 'frasco', label: 'Frasco', text: 'Corpo largo e gargalo fino.' },
  { id: 'medidor', label: 'Medidor', text: 'Copo com volume exato.' },
  { id: 'colher', label: 'Colher medidora', text: 'Colher com cabo e volume exato.' },
  { id: 'flor', label: 'Xícara flor', text: 'Xícara em formato de flor.' },
  { id: 'pires', label: 'Pires flor', text: 'Pires com pétalas.' },
  { id: 'bule', label: 'Bule', text: 'Com bico, alça e tampa.' },
  { id: 'acucareiro', label: 'Açucareiro', text: 'Pote redondo com tampa.' },
  { id: 'tampa', label: 'Tampa', text: 'Tampa com botão em flor.' },
  { id: 'gato', label: 'Gato', text: 'Com orelhas e rosto gravado.' },
];

// Slider ranges that depend on the form (cm).
function formRanges(form: Form) {
  return {
    height: { min: form === 'pires' ? 1.5 : form === 'prato' ? 2 : form === 'tampa' ? 2 : form === 'tigela' ? 4 : 10, max: 28 },
    base: { min: 3, max: 18 },
    belly: { min: 7, max: 25 },
    mouth: { min: form === 'frasco' ? 2 : 5, max: 25 },
    roundBody: form === 'tigela' || isPlate(form),
    lid: form === 'tampa',
    cup: isCup(form),
  };
}

function disposeGroup(group: THREE.Group) {
  for (const child of [...group.children]) {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => material.dispose());
    }
    group.remove(child);
  }
}

const SINK = 1.5;
const WELL_FLARE = 8;
const WALL_TOLERANCE = 0.4;
const RIB_THICKNESS = 1.6;
const PLASTER_DENSITY = 2.65;

function shrinkScale(settings: Settings) {
  return 1 / (1 - settings.shrink / 100);
}

// Matrix dimensions in mm: the fired size grown by the clay shrinkage.
function dims(settings: Settings) {
  const k = shrinkScale(settings);
  return {
    k,
    height: settings.height * 10 * k,
    base: settings.base * 5 * k,
    belly: settings.belly * 5 * k,
    mouth: settings.mouth * 5 * k,
    lip: settings.form === 'gato' ? 0 : settings.lip * k,
  };
}

const showFace = (settings: Settings) => settings.form === 'gato' && settings.face;

// Centerline of an ear: it leans outward and bends gently toward the head, with a rounded tip.
function earSpine(earHeight: number, earBase: number, tilt: number, steps = 28) {
  const bend = 0.4;
  const step = earHeight / steps;
  let x = -Math.sin(tilt) * earBase * 0.3;
  let y = -Math.cos(tilt) * earBase * 0.3;
  const spine: { x: number; y: number; theta: number; radius: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const theta = tilt - bend * s;
    spine.push({ x, y, theta, radius: earBase * Math.pow(1 - s, 0.6) });
    x += Math.sin(theta) * step;
    y += Math.cos(theta) * step;
  }
  return spine;
}

// Cat proportions in mm: a head narrower than the belly, with the ears set on its sides.
function catShape(settings: Settings) {
  const { k, height, belly, mouth } = dims(settings);
  const headR = Math.max(mouth * 1.4, belly * 0.66);
  const tilt = THREE.MathUtils.degToRad(settings.earTilt);
  const earHeight = settings.earHeight * 10 * k;
  const earBase = headR * 0.42;
  const earX = headR * 0.5;
  const earY = height * 0.82;
  const spine = earSpine(earHeight, earBase, tilt);
  return {
    headR,
    headY: height * 0.76,
    neckY: Math.min(height * 0.72, Math.max(height * 0.6, (height * settings.bellyPos) / 100 + height * 0.08)),
    earX,
    earY,
    spine,
    earReach: earX + Math.max(...spine.map((p) => p.x + p.radius)),
    earTop: earY + Math.max(...spine.map((p) => p.y)),
  };
}

const EAR_THICKNESS = 0.55;

// Sweeps an elliptical section along the spine; in the half piece only z >= 0 is built and the flat side is buried in the plate.
function makeEarGeometry(spine: ReturnType<typeof earSpine>, half: boolean, mirror: boolean) {
  const sides = 20;
  const sign = mirror ? -1 : 1;
  const span = half ? Math.PI : Math.PI * 2;
  const positions: number[] = [];
  const indices: number[] = [];
  for (const p of spine) {
    const nx = -Math.cos(p.theta);
    const ny = Math.sin(p.theta);
    for (let k = 0; k <= sides; k++) {
      const angle = (k / sides) * span;
      const across = p.radius * Math.cos(angle);
      positions.push(
        (p.x + nx * across) * sign,
        p.y + ny * across,
        p.radius * EAR_THICKNESS * Math.sin(angle),
      );
    }
  }
  const row = sides + 1;
  for (let i = 0; i < spine.length - 1; i++) {
    for (let k = 0; k < sides; k++) {
      const a = i * row + k;
      const b = a + 1;
      const c = a + row + 1;
      const d = a + row;
      if (mirror) indices.push(a, d, b, b, d, c);
      else indices.push(a, b, d, b, c, d);
    }
  }
  const center = positions.length / 3;
  positions.push(spine[0].x * sign, spine[0].y, 0);
  for (let k = 0; k < sides; k++) {
    if (mirror) indices.push(center, k, k + 1);
    else indices.push(center, k + 1, k);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeEars(settings: Settings, material: THREE.Material, half: boolean, sink: number) {
  const cat = catShape(settings);
  return [-1, 1].map((side) => {
    const ear = new THREE.Mesh(makeEarGeometry(cat.spine, half, side < 0), material);
    ear.position.set(side * cat.earX, cat.earY, half ? -sink : 0);
    ear.castShadow = true;
    ear.receiveShadow = true;
    return ear;
  });
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

// Repeated patterns fill whole tiles inside the chosen height band; a single motif is centered on the front.
function patternGrid(settings: Settings): PatternGrid | null {
  if (settings.pattern === 'nenhum') return null;
  if (settings.pattern === 'imagem') {
    if (!hasImageTexture()) return null;
    setImageThickness(settings.imageThickness);
  }
  const { k, height, belly } = dims(settings);
  const pitch = settings.patternSize * k;
  const bandStart = (height * settings.patternFrom) / 100;
  const bandEnd = (height * Math.max(settings.patternTo, settings.patternFrom + 15)) / 100;
  const rows = settings.single ? 1 : Math.floor((bandEnd - bandStart) / pitch);
  if (rows < 1) return null;
  return {
    tiles: Math.max(3, Math.round((2 * Math.PI * belly) / pitch)),
    pitch,
    y0: (bandStart + bandEnd) / 2 - (rows * pitch) / 2,
    rows,
    single: settings.single,
    invert: settings.imageInvert,
  };
}

// Mesh density: finer when a pattern needs to be resolved.
function detail(settings: Settings) {
  const fine = patternGrid(settings) !== null || showFace(settings) || settings.petals >= 3 || SHAPE_STYLES.includes(settings.mouthStyle);
  const { height, belly } = dims(settings);
  return {
    samples: fine ? Math.min(300, Math.ceil(height / 1.1)) : 72,
    full: fine ? Math.min(480, Math.ceil((2 * Math.PI * belly) / 1.1)) : 96,
    half: fine ? Math.min(260, Math.ceil((Math.PI * belly) / 1.1)) : 48,
  };
}

// Pushes the outer surface of a lathe mesh in or out; near the split plane of a half piece the relief fades to keep it demoldable.
function decorate(
  geometry: THREE.LatheGeometry,
  settings: Settings,
  layout: { outerCount: number; profileLength: number; segments: number; half: boolean },
) {
  const grid = patternGrid(settings);
  const cat = showFace(settings) ? catShape(settings) : null;
  const petals = settings.petals >= 3 ? settings.petals : 0;
  const shape = SHAPE_STYLES.includes(settings.mouthStyle);
  if (!grid && !cat && !petals && !shape) return;
  const { k, height: bodyHeight } = dims(settings);
  const mouthBand = Math.max(1, Math.min(settings.mouthBand * k, bodyHeight * 0.6));
  const petalDepth = settings.petalDepth / 100;
  const petalTwist = (settings.petalTwist * Math.PI) / 180;
  const amplitude = settings.patternDepth * k * (settings.engrave ? -1 : 1);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i <= layout.segments; i++) {
    for (let j = 0; j < layout.outerCount; j++) {
      const index = i * layout.profileLength + j;
      const x = position.getX(index);
      const z = position.getZ(index);
      const r = Math.hypot(x, z);
      if (r < 1) continue;
      const phi = Math.atan2(x, z);
      const y = position.getY(index);
      let offset = 0;
      // Mouth section: round morphs into a polygon, oval, star or ruffle over the top band.
      if (shape) {
        const t = clamp01((y - (bodyHeight - mouthBand)) / mouthBand);
        if (t > 0) offset += r * (mouthRatio(settings.mouthStyle, phi) - 1) * t * t * (3 - 2 * t);
      }
      // Petals: valleys cut inward toward the rim, tips keep the full radius.
      if (petals) {
        const lift = Math.min(1, Math.max(0, y / bodyHeight));
        const rise = settings.petalFull ? 1 : Math.pow(lift, 0.8);
        const u = (((petals * (phi + petalTwist * lift)) / (2 * Math.PI) + 0.5) % 1 + 1) % 1;
        // Each petal is a convex arc; the seams between petals are sharp grooves.
        const arc = Math.sqrt(Math.max(0, 1 - Math.pow(2 * u - 1, 2)));
        offset -= r * petalDepth * rise * (1 - arc);
      }
      if (grid) {
        let height = patternHeight(settings.pattern, phi, y, grid);
        if (height > 0 && layout.half) {
          const fade = clamp01((Math.PI / 2 - Math.abs(phi) - 0.1) / 0.35);
          height *= fade * fade * (3 - 2 * fade);
        }
        offset += height * amplitude;
      }
      if (cat) offset -= catFaceHeight(phi * cat.headR, y - cat.headY, cat.headR) * 1.2 * k;
      if (offset === 0) continue;
      const scale = (r + offset) / r;
      position.setX(index, x * scale);
      position.setZ(index, z * scale);
    }
  }
  position.needsUpdate = true;
  if ((settings.rimWave > 0 && petals) || settings.mouthStyle === 'babado') {
    // The rim dips in the grooves between petals (or ruffles), so the edge is scalloped.
    const ruffle = settings.mouthStyle === 'babado';
    const count = ruffle ? 9 : petals;
    const wave = ruffle ? Math.min(mouthBand * 0.3, 8 * k) : settings.rimWave * k;
    const band = wave * 3;
    for (let i = 0; i <= layout.segments; i++) {
      for (let j = 0; j < layout.profileLength; j++) {
        if (layout.half && j >= layout.outerCount) continue;
        const index = i * layout.profileLength + j;
        const y = position.getY(index);
        if (y < bodyHeight - band) continue;
        const x = position.getX(index);
        const z = position.getZ(index);
        if (Math.hypot(x, z) < 1) continue;
        const weight = Math.min(1, (y - (bodyHeight - band)) / band);
        const u = (((count * (Math.atan2(x, z) + petalTwist)) / (2 * Math.PI) + 0.5) % 1 + 1) % 1;
        const arc = Math.sqrt(Math.max(0, 1 - Math.pow(2 * u - 1, 2)));
        position.setY(index, y - wave * (1 - arc) * weight * weight * (3 - 2 * weight));
      }
    }
    position.needsUpdate = true;
  }
  geometry.computeVertexNormals();
  if (layout.half) return;
  // The first and last columns of a full revolution share positions; average their normals to hide the seam.
  const normal = geometry.attributes.normal as THREE.BufferAttribute;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (let j = 0; j < layout.profileLength; j++) {
    const first = j;
    const last = layout.segments * layout.profileLength + j;
    a.fromBufferAttribute(normal, first);
    b.fromBufferAttribute(normal, last);
    a.add(b).normalize();
    normal.setXYZ(first, a.x, a.y, a.z);
    normal.setXYZ(last, a.x, a.y, a.z);
  }
  normal.needsUpdate = true;
}

type MouthStyle = 'liso' | 'enrolado' | 'beico' | 'sino' | 'fechado' | 'gargalo' | 'quadrado' | 'oval' | 'triangular' | 'sextavado' | 'estrela' | 'babado';

const MOUTHS: { id: MouthStyle; label: string; text: string; band: number; open: number }[] = [
  { id: 'liso', label: 'Sem acabamento', text: 'Boca reta', band: 20, open: 30 },
  { id: 'enrolado', label: 'Enrolado', text: 'Borda grossa', band: 10, open: 30 },
  { id: 'beico', label: 'Beiço virado', text: 'Borda para fora', band: 14, open: 40 },
  { id: 'sino', label: 'Sino', text: 'Abre em campana', band: 40, open: 32 },
  { id: 'fechado', label: 'Fechado', text: 'Boca estreita', band: 30, open: -40 },
  { id: 'gargalo', label: 'Gargalo', text: 'Pescoço fino', band: 45, open: 30 },
  { id: 'quadrado', label: 'Quadrado', text: 'Boca quadrada', band: 30, open: 30 },
  { id: 'oval', label: 'Oval', text: 'Boca achatada', band: 30, open: 30 },
  { id: 'triangular', label: 'Triangular', text: 'Três pontas', band: 30, open: 30 },
  { id: 'sextavado', label: 'Sextavado', text: 'Seis lados', band: 30, open: 30 },
  { id: 'estrela', label: 'Estrela', text: 'Cinco pontas', band: 30, open: 30 },
  { id: 'babado', label: 'Babado', text: 'Borda ondulada', band: 24, open: 30 },
];
const SHAPE_STYLES: MouthStyle[] = ['quadrado', 'oval', 'triangular', 'sextavado', 'estrela', 'babado'];
const FLARE_STYLES: MouthStyle[] = ['beico', 'sino', 'fechado'];

// Radius of the mouth section relative to the round one, at angle phi (0 = front).
function mouthRatio(style: MouthStyle, phi: number) {
  const polygon = (sides: number, apothem: number) => {
    const step = (2 * Math.PI) / sides;
    const delta = ((((phi + step / 2) % step) + step) % step) - step / 2;
    return 0.75 * (apothem / Math.cos(delta)) + 0.25;
  };
  if (style === 'quadrado') return polygon(4, 0.86);
  if (style === 'triangular') return polygon(3, 0.68);
  if (style === 'sextavado') return polygon(6, 0.94);
  if (style === 'oval') return 1 / Math.sqrt(Math.pow(Math.sin(phi) / 1.3, 2) + Math.pow(Math.cos(phi) / 0.8, 2));
  if (style === 'estrela') return 0.78 + 0.42 * Math.pow(0.5 + 0.5 * Math.cos(5 * phi), 1.5);
  if (style === 'babado') return 1 + 0.06 * Math.sin(9 * phi);
  return 1;
}

// Rim finishes that change the profile itself: rolled bead, flared lip, bell, closed mouth and neck.
function applyMouth(points: THREE.Vector2[], settings: Settings, k: number, height: number) {
  const style = settings.mouthStyle;
  if (!['enrolado', 'beico', 'sino', 'fechado', 'gargalo'].includes(style)) return points;
  const band = Math.min(settings.mouthBand * k, height * 0.6);
  const y0 = height - band;
  const out = points.filter((p) => p.y < y0 - 1e-6);
  const slope = Math.tan((Math.abs(settings.mouthOpen) * Math.PI) / 180);
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = y0 + band * t;
    let x = radiusAt(points, y);
    if (style === 'beico') x += band * slope * t;
    else if (style === 'sino') x += band * slope * t * t;
    else if (style === 'fechado') x -= band * slope * Math.pow(Math.sin((t * Math.PI) / 2), 1.2);
    else if (style === 'gargalo') {
      const u = Math.min(1, t / 0.5);
      x *= 1 - 0.55 * u * u * (3 - 2 * u);
    } else x += (band / 2) * 0.9 * Math.sqrt(Math.max(0, 1 - Math.pow(2 * t - 1, 2)));
    out.push(new THREE.Vector2(Math.max(2, x), y));
  }
  return out;
}

function rimRadius(settings: Settings) {
  const points = outerProfile(settings).points;
  return points[points.length - 1].x;
}

function outerProfile(settings: Settings) {
  const { k, height, base, belly, mouth, lip } = dims(settings);
  if (settings.form === 'tampa') {
    // Lid: a flange that sits inside the rim, a dome and a bud-shaped knob.
    const V = (x: number, y: number) => new THREE.Vector2(x, y);
    const flange = Math.min(4 * k, height * 0.25);
    const inset = Math.max(2, mouth - 6 * k);
    const neck = height * 0.62;
    const knob = Math.max(2, mouth * 0.16);
    const pts = [V(0, 0), V(inset, 0), V(inset, flange), V(mouth, flange)];
    for (let i = 1; i <= 12; i++) {
      const a = (i / 12) * (Math.PI / 2);
      pts.push(V(knob * 0.8 + (mouth - knob * 0.8) * Math.cos(a), flange + (neck - flange) * Math.sin(a)));
    }
    const cy = neck + (height - neck) * 0.5;
    const ry = (height - neck) * 0.5;
    for (let i = 0; i <= 12; i++) {
      const t = (-70 + (160 * i) / 12) * (Math.PI / 180);
      pts.push(V(Math.abs(knob * 1.25 * Math.cos(t)) < 0.01 ? 0 : knob * 1.25 * Math.cos(t), cy + ry * Math.sin(t)));
    }
    return { bellyY: height * 0.5, points: pts };
  }
  const bellyY = height * settings.bellyPos / 100;
  const cat = settings.form === 'gato' ? catShape(settings) : null;
  const open = settings.form === 'tigela' || isPlate(settings.form) || isCup(settings.form);
  const bowlShape = (h: number) => isCup(settings.form)
    ? CUP_STYLES[settings.cupStyle].g(h)
    : isPlate(settings.form) ? Math.pow(h, 1.4) : Math.sqrt(1 - Math.pow(1 - h, 2));
  const bowlPoints = [0.03, 0.2, 0.45, 0.7, 0.9, 0.97].map((h) => (
    new THREE.Vector2(base + (mouth - base) * bowlShape(h), height * h)
  ));
  const neckY = bellyY + (height * 0.8 - bellyY) * 0.55;
  const curve = new THREE.SplineCurve(open ? [
    new THREE.Vector2(base * 0.86, 0),
    ...bowlPoints,
    new THREE.Vector2(mouth + lip, height),
  ] : settings.form === 'frasco' ? [
    new THREE.Vector2(base * 0.86, 0),
    new THREE.Vector2(base, height * 0.025),
    new THREE.Vector2(base * 1.04, height * 0.14),
    new THREE.Vector2(belly, bellyY),
    new THREE.Vector2(mouth + (belly - mouth) * 0.3, neckY),
    new THREE.Vector2(mouth * 1.05, height * 0.8),
    new THREE.Vector2(mouth, height * 0.95),
    new THREE.Vector2(mouth + lip, height),
  ] : cat ? [
    new THREE.Vector2(base * 0.86, 0),
    new THREE.Vector2(base, height * 0.025),
    new THREE.Vector2(base + (belly - base) * 0.6, height * 0.15),
    new THREE.Vector2(belly, bellyY),
    new THREE.Vector2(cat.headR * 0.94, cat.neckY),
    new THREE.Vector2(cat.headR, cat.headY),
    new THREE.Vector2(mouth + (cat.headR - mouth) * 0.5, height * 0.91),
    new THREE.Vector2(mouth, height * 0.97),
    new THREE.Vector2(mouth + lip, height),
  ] : [
    new THREE.Vector2(base * 0.86, 0),
    new THREE.Vector2(base, height * 0.025),
    new THREE.Vector2(base * 1.04, height * 0.14),
    new THREE.Vector2(belly, bellyY),
    new THREE.Vector2(mouth * 1.04, height * 0.86),
    new THREE.Vector2(mouth, height * 0.97),
    new THREE.Vector2(mouth + lip, height),
  ]);
  const footH = settings.foot > 0 && !cat ? Math.min(settings.foot * k, height * 0.4) : 0;
  const body = curve.getPoints(detail(settings).samples).map((p) => new THREE.Vector2(p.x, footH + (p.y * (height - footH)) / height));
  const stem = footH > 0
    ? [[0.8, 0], [0.8, 0.1], [0.63, 0.22], [0.46, 0.45], [0.42, 0.7], [0.48, 0.95], [0.5, 1]].map(([r, h]) => new THREE.Vector2(base * r, footH * h))
    : [];
  return { bellyY, points: applyMouth([new THREE.Vector2(0, 0), ...stem, ...body], settings, k, height) };
}

// Solid profile of the half piece; the slip well flares above the rim.
function halfProfile(settings: Settings) {
  const { height } = dims(settings);
  const points = outerProfile(settings).points;
  if (settings.form === 'tampa') return points;
  const rim = points[points.length - 1].x;
  if (settings.well > 0) {
    return [
      ...points,
      new THREE.Vector2(rim + WELL_FLARE, height + settings.well),
      new THREE.Vector2(0, height + settings.well),
    ];
  }
  return [...points, new THREE.Vector2(rim, height + 1.5), new THREE.Vector2(0, height + 1.5)];
}

// Outer radius of the (undecorated) body at height y, in mm.
function radiusAt(points: THREE.Vector2[], y: number) {
  let nearest = points[0]?.x ?? 0;
  let gap = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (b.y !== a.y && y >= Math.min(a.y, b.y) && y <= Math.max(a.y, b.y)) {
      return a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y);
    }
    const distance = Math.min(Math.abs(y - a.y), Math.abs(y - b.y));
    if (distance < gap) {
      gap = distance;
      nearest = Math.abs(y - a.y) < Math.abs(y - b.y) ? a.x : b.x;
    }
  }
  return nearest;
}

function handleAttach(settings: Settings): Attach {
  const { k, height } = dims(settings);
  const profile = outerProfile(settings).points;
  const yTop = (height * settings.handleHeight) / 100;
  const yBot = height * Math.max(0.12, (settings.handleHeight - settings.handleSpan) / 100);
  const thickness = settings.handleThickness * k;
  // The body can narrow above or below the attachment point; use its narrowest radius within the tube's reach so the handle always touches it.
  const wall = (y: number) => {
    let radius = Infinity;
    for (let i = -3; i <= 3; i++) radius = Math.min(radius, radiusAt(profile, y + i * thickness * 0.5));
    const petal = settings.petals >= 3 ? (settings.petalDepth / 100) * Math.pow(Math.min(1, y / height), 0.8) : 0;
    return radius * (1 - petal) - thickness * 0.3 - settings.handleSink;
  };
  return {
    rTop: wall(yTop),
    yTop,
    rBot: wall(yBot),
    yBot,
    reach: settings.handle * 10 * k,
    thickness: settings.handleThickness * k,
  };
}

function handlePlanFor(settings: Settings) {
  if (settings.handleStyle === 'nenhuma') return null;
  return handlePlan(settings.handleStyle, handleAttach(settings));
}

// Pouring spout on the -x side, in the split plane: rim shapes (lip, rounded, beak) or tubes rising from the body.
function spoutParts(settings: Settings, half: boolean) {
  const type = settings.spoutType;
  if (type === 'nenhum' || NO_SPOUT.includes(settings.form)) return [];
  const { k, height, mouth } = dims(settings);
  const scale = settings.spoutSize / 100;
  if (type === 'labio' || type === 'arredondado' || type === 'bico') return spoutGeometries(type, rimRadius(settings), height, scale, settings.spoutWidth / 100, settings.spoutCount, settings.spoutPos, half);
  const profile = outerProfile(settings).points;
  const long = type === 'pescoco';
  const thickness = settings.handleThickness * k * 1.8 * (long ? 0.7 : 1) * Math.sqrt(scale);
  const reach = (mouth * 0.9 + 12 * k) * scale * (long ? 1.3 : 1);
  const yLow = height * (long ? 0.12 : 0.2);
  const yTip = height * (long ? 1.15 : 0.97);
  const path: [number, number][] = [];
  for (let i = 0; i <= 10; i++) {
    const s = i / 10;
    const y = yLow + (yTip - yLow) * s;
    path.push([-(radiusAt(profile, Math.min(y, height)) - thickness * 0.5 + reach * Math.pow(s, long ? 2 : 1.2)), y]);
  }
  return handleGeometries(tubePlan(path, (u) => thickness * (1 - 0.55 * u)), half);
}

// Where the applied object goes: on the rim or handle (split plane) or on the front of the body.
function figurePlacement(settings: Settings, plan: ReturnType<typeof handlePlanFor>) {
  const def = figureById(settings.figure);
  if (!def) return null;
  const { k, height } = dims(settings);
  const size = settings.figureSize * k;
  const s = size / 2;
  if (def.place === 'front') {
    const y = def.onRim ? height : (height * settings.figureHeight) / 100;
    const radius = def.onRim ? rimRadius(settings) : radiusAt(outerProfile(settings).points, y);
    return { def, size, x: 0, y: y - def.base * s, z: radius - size * 0.04 };
  }
  if (settings.figurePlace === 'alca' && plan) {
    return { def, size, x: plan.top.x, y: plan.top.y + plan.top.radius * 0.6 - 0.1 * s - def.base * s, z: 0 };
  }
  return { def, size, x: rimRadius(settings), y: height - 0.1 * s - def.base * s, z: 0 };
}

const boundsCache = new Map<string, { minX: number; maxX: number; maxY: number }>();

// Extents of the handle and the applied object, used to size the mold plate.
function attachmentBounds(settings: Settings) {
  const key = JSON.stringify([
    settings.form, settings.height, settings.base, settings.belly, settings.mouth, settings.lip, settings.bellyPos,
    settings.shrink, settings.handleStyle, settings.handle, settings.handleHeight, settings.handleSpan,
    settings.handleThickness, settings.handleSink, settings.figure, settings.figureSize, settings.figurePlace, settings.figureHeight, settings.spoutType, settings.spoutSize, settings.spoutCount, settings.spoutWidth, settings.spoutPos, settings.petalFull, settings.mouthStyle, settings.mouthBand, settings.mouthOpen, settings.petals, settings.petalDepth, settings.leaves, settings.foot,
  ]);
  const cached = boundsCache.get(key);
  if (cached) return cached;
  const box = new THREE.Box3();
  const plan = handlePlanFor(settings);
  const place = figurePlacement(settings, plan);
  const include = (geometries: THREE.BufferGeometry[], dx: number, dy: number) => {
    for (const geometry of geometries) {
      geometry.computeBoundingBox();
      box.union(geometry.boundingBox!.clone().translate(new THREE.Vector3(dx, dy, 0)));
      geometry.dispose();
    }
  };
  if (plan) include(handleGeometries(plan, true), 0, 0);
  if (settings.leaves >= 3) include(leafRingGeometries(settings.leaves, dims(settings).base, true), 0, 0);
  include(spoutParts(settings, true), 0, 0);
  if (place) include(figureGeometries(place.def, place.size, true), place.x, place.y);
  const result = box.isEmpty() ? { minX: 0, maxX: 0, maxY: 0 } : { minX: box.min.x, maxX: box.max.x, maxY: box.max.y };
  if (boundsCache.size > 80) boundsCache.clear();
  boundsCache.set(key, result);
  return result;
}

function halfLayout(settings: Settings) {
  const { height, base, belly } = dims(settings);
  const margin = settings.plateMargin * 10;
  const wellRadius = rimRadius(settings) + (settings.well > 0 ? WELL_FLARE : 0);
  const attached = attachmentBounds(settings);
  const halfWidth = Math.max(belly, wellRadius, settings.form === 'gato' ? catShape(settings).earReach : 0, -attached.minX);
  const right = Math.max(halfWidth, attached.maxX);
  const minX = -halfWidth - margin;
  const maxX = right + margin;
  const minY = -margin;
  const maxY = Math.max(height + (settings.well > 0 ? settings.well : 1.5), settings.form === 'gato' ? catShape(settings).earTop : 0, attached.maxY) + margin;
  const protrusion = Math.max(belly, base * 1.04, wellRadius) - SINK;
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    plateHeight: maxY - minY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    ringTop: protrusion + settings.plasterAbove,
  };
}

// Slurry volume above the plate minus the matrix, per mold half, with a 10% reserve.
function plasterEstimate(settings: Settings) {
  const layout = halfLayout(settings);
  const points = halfProfile(settings);
  let revolved = 0;
  let silhouette = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const h = b.y - a.y;
    revolved += (Math.PI * h * (a.x * a.x + a.x * b.x + b.x * b.x)) / 3;
    silhouette += (a.x + b.x) * h;
  }
  let matrix = Math.max(0, revolved / 2 - silhouette * SINK);
  const plan = handlePlanFor(settings);
  if (plan) {
    const r = settings.handleThickness * dims(settings).k;
    matrix += Math.max(0, ((Math.PI * r * r) / 2 - 2 * r * SINK) * plan.length);
  }
  const slurry = ((layout.width * layout.plateHeight * layout.ringTop - matrix) / 1000) * 1.1;
  const plaster = (slurry * 100) / (100 / PLASTER_DENSITY + settings.waterRatio);
  return { slurry, plaster, water: (plaster * settings.waterRatio) / 100, matrixCm3: matrix / 1000 };
}

function makeWalls(settings: Settings, target: THREE.Group) {
  const layout = halfLayout(settings);
  const plateThickness = settings.plateThickness;
  const outerPad = WALL_TOLERANCE + settings.wallThickness;
  const rect = (pad: number, path: THREE.Path) => {
    path.moveTo(layout.minX - pad, layout.minY - pad);
    path.lineTo(layout.maxX + pad, layout.minY - pad);
    path.lineTo(layout.maxX + pad, layout.maxY + pad);
    path.lineTo(layout.minX - pad, layout.maxY + pad);
    path.closePath();
  };
  const shape = new THREE.Shape();
  rect(outerPad, shape);
  const hole = new THREE.Path();
  rect(WALL_TOLERANCE, hole);
  shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: layout.ringTop + plateThickness, bevelEnabled: false });
  geometry.translate(0, 0, -plateThickness);
  target.add(new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: '#6fb1d1', roughness: 0.4, transparent: true, opacity: 0.32, depthWrite: false }),
  ));
}

// Hollow body: an inner surface offset by the shell, plus thin ribs that hold up the roof so the slicer needs no infill.
function hollowHalf(settings: Settings, outer: THREE.Vector2[]) {
  const { k } = dims(settings);
  const shell = settings.shellThickness + (patternGrid(settings) ? settings.patternDepth * k : 0) + (showFace(settings) ? 1.2 * k : 0);
  const top = outer[outer.length - 1].y;
  const inner: THREE.Vector2[] = [];
  for (let i = outer.length - 2; i >= 1; i--) {
    const p = outer[i];
    if (p.y < shell || p.y > top - shell || p.x - shell < 1) continue;
    inner.push(new THREE.Vector2(p.x - shell, p.y));
  }
  const profile = [...outer, new THREE.Vector2(0, top - shell), ...inner, new THREE.Vector2(0, shell)];
  const ribs: { y: number; radius: number }[] = [];
  for (let y = shell + settings.ribSpacing / 2; y < top - shell; y += settings.ribSpacing) {
    ribs.push({ y, radius: Math.max(2, radiusAt(outer, y) - shell * 0.5) });
  }
  return { profile, ribs };
}

function makeHalf(settings: Settings, target: THREE.Group) {
  const layout = halfLayout(settings);
  const thickness = settings.plateThickness;
  const sink = SINK;
  const material = new THREE.MeshStandardMaterial({ color: '#d1a77f', roughness: 0.38, metalness: 0.02 });
  const plateMaterial = new THREE.MeshStandardMaterial({ color: '#bfa98a', roughness: 0.55, metalness: 0.02 });

  const add = (mesh: THREE.Mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    target.add(mesh);
  };

  const plate = new THREE.Mesh(new THREE.BoxGeometry(layout.width, layout.plateHeight, thickness), plateMaterial);
  plate.position.set(layout.cx, layout.cy, -thickness / 2);
  plate.userData.plate = true;
  add(plate);

  const solid = halfProfile(settings);
  const { profile, ribs } = settings.hollow ? hollowHalf(settings, solid) : { profile: solid, ribs: [] };
  const { half: segments, samples } = detail(settings);
  const geometry = new THREE.LatheGeometry(profile, segments, -Math.PI / 2, Math.PI);
  decorate(geometry, settings, { outerCount: samples + 2, profileLength: profile.length, segments, half: true });
  const body = new THREE.Mesh(geometry, material);
  body.position.z = -sink;
  add(body);

  for (const rib of ribs) {
    const slab = new THREE.Mesh(
      new THREE.CylinderGeometry(rib.radius, rib.radius, RIB_THICKNESS, 48, 1, false, -Math.PI / 2, Math.PI),
      material,
    );
    slab.position.set(0, rib.y, -sink);
    add(slab);
  }

  const plan = handlePlanFor(settings);
  if (plan) {
    for (const part of handleGeometries(plan, true)) {
      const handle = new THREE.Mesh(part, material);
      handle.position.z = -sink;
      add(handle);
    }
  }

  for (const part of spoutParts(settings, true)) {
    const spout = new THREE.Mesh(part, material);
    spout.position.z = -sink;
    add(spout);
  }

  if (settings.leaves >= 3) {
    for (const part of leafRingGeometries(settings.leaves, dims(settings).base, true)) {
      const leaf = new THREE.Mesh(part, material);
      leaf.position.z = -sink;
      add(leaf);
    }
  }

  const placement = figurePlacement(settings, plan);
  if (placement) {
    for (const part of figureGeometries(placement.def, placement.size, true)) {
      const piece = new THREE.Mesh(part, material);
      piece.position.set(placement.x, placement.y, placement.z - sink);
      add(piece);
    }
  }

  if (settings.form === 'gato') {
    for (const ear of makeEars(settings, material, true, sink)) add(ear);
  }

  const inset = 12;
  const keyRadius = 7;
  for (const x of [layout.minX + inset, layout.maxX - inset]) {
    for (const y of [layout.minY + inset, layout.maxY - inset]) {
      const geometry = new THREE.SphereGeometry(keyRadius, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      geometry.rotateX(Math.PI / 2);
      const key = new THREE.Mesh(geometry, material);
      key.position.set(x, y, -1);
      add(key);
    }
  }
}

function computeView(settings: Settings, mode: Mode, aspect: number, compact: boolean) {
  if (mode === 'completa') {
    return {
      target: new THREE.Vector3(0, dims(settings).height / 2, 0),
      position: new THREE.Vector3(0, compact ? 190 : 245, compact ? 450 : 590),
    };
  }
  const layout = halfLayout(settings);
  const tan = Math.tan(THREE.MathUtils.degToRad(17.5));
  const distance = 1.2 * Math.max(layout.plateHeight / 2 / tan, layout.width / 2 / (tan * Math.max(aspect, 0.2)));
  return {
    target: new THREE.Vector3(layout.cx, layout.cy, 0),
    position: new THREE.Vector3(layout.cx, layout.cy + distance * 0.1, distance),
  };
}

// --- Preview of the fired and glazed piece (never exported).
type FinishLook = {
  on: boolean;
  body: string;
  inside: string;
  accent: string;
  sameAccent: boolean;
  gloss: 'brilho' | 'acetinado' | 'fosco';
  ombre: boolean;
};

const GLOSS = {
  brilho: { rough: 0.14, coat: 0.8, coatRough: 0.05, env: 0.55 },
  acetinado: { rough: 0.42, coat: 0.3, coatRough: 0.3, env: 0.3 },
  fosco: { rough: 0.85, coat: 0, coatRough: 0.5, env: 0.12 },
};

function glazeMaterial(look: FinishLook, env: THREE.Texture | null | undefined, vertexColors: boolean, color = '#ffffff') {
  const g = GLOSS[look.gloss];
  return new THREE.MeshPhysicalMaterial({
    color,
    vertexColors,
    roughness: g.rough,
    clearcoat: g.coat,
    clearcoatRoughness: g.coatRough,
    envMap: env ?? null,
    envMapIntensity: g.env,
  });
}

// Exterior, interior, foot and an optional fade toward the interior color near the rim.
function paintGlaze(geometry: THREE.BufferGeometry, settings: Settings, look: FinishLook, outerCount: number, profileLength: number) {
  const { k, height } = dims(settings);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const outside = new THREE.Color(look.body);
  const inside = new THREE.Color(look.inside);
  const accent = new THREE.Color(look.sameAccent ? look.body : look.accent);
  const footTop = settings.form === 'gato' ? 0 : settings.foot * k + 0.5;
  const colors = new Float32Array(position.count * 3);
  const mixed = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    if (i % profileLength >= outerCount) mixed.copy(inside);
    else if (settings.foot > 0 && y < footTop) mixed.copy(accent);
    else {
      mixed.copy(outside);
      if (look.ombre) {
        const t = Math.min(1, Math.max(0, (y / height - 0.45) / 0.55));
        mixed.lerp(inside, t * t * (3 - 2 * t) * 0.85);
      }
    }
    colors.set([mixed.r, mixed.g, mixed.b], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

const GLAZE_COLORS = ['#f3efe6', '#9bb8d3', '#5f8fbf', '#3f5fa8', '#d98aa3', '#e8c35b', '#7fa24a', '#2f6b57', '#b8532f', '#c9b79c', '#8a6fb0', '#2a2a2e'];

function makeVessel(settings: Settings, target: THREE.Group, look?: FinishLook, env?: THREE.Texture | null) {
  const { height } = dims(settings);
  const wall = settings.wall;
  const { points } = outerProfile(settings);
  const inner = points
    .slice(1)
    .filter((p) => p.y >= wall)
    .reverse()
    .map((p) => new THREE.Vector2(Math.max(1, p.x - wall), p.y));
  const profile = settings.form === 'tampa' ? points : [
    ...points,
    new THREE.Vector2(rimRadius(settings), height + 1.5),
    new THREE.Vector2(Math.max(1, rimRadius(settings) - wall), height + 1.5),
    ...inner,
    new THREE.Vector2(0, wall),
  ];
  const { full: segments } = detail(settings);
  const geometry = new THREE.LatheGeometry(profile, segments);
  decorate(geometry, settings, { outerCount: points.length, profileLength: profile.length, segments, half: false });
  const material = new THREE.MeshStandardMaterial({ color: '#d1a77f', roughness: 0.38, metalness: 0.02 });
  const add = (mesh: THREE.Mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    target.add(mesh);
  };
  if (look) paintGlaze(geometry, settings, look, points.length, profile.length);
  const bodyMaterial = look ? glazeMaterial(look, env, true) : material;
  const detailMaterial = look ? glazeMaterial(look, env, false, look.sameAccent ? look.body : look.accent) : material;
  add(new THREE.Mesh(geometry, bodyMaterial));

  const plan = handlePlanFor(settings);
  if (plan) {
    for (const part of handleGeometries(plan, false)) add(new THREE.Mesh(part, detailMaterial));
  }

  for (const part of spoutParts(settings, false)) add(new THREE.Mesh(part, detailMaterial));

  if (settings.leaves >= 3) {
    for (const part of leafRingGeometries(settings.leaves, dims(settings).base, false)) add(new THREE.Mesh(part, detailMaterial));
  }

  const placement = figurePlacement(settings, plan);
  if (placement) {
    for (const part of figureGeometries(placement.def, placement.size, false)) {
      const piece = new THREE.Mesh(part, detailMaterial);
      piece.position.set(placement.x, placement.y, placement.z);
      add(piece);
    }
  }

  if (settings.form === 'gato') {
    const earMaterial = look ? glazeMaterial(look, env, false, look.body) : material;
    for (const ear of makeEars(settings, earMaterial, false, 0)) add(ear);
  }
}

// Total triangle area of every mesh, in cm²; it drives material and print time in the quote.
function surfaceArea(object: THREE.Object3D, skip?: (mesh: THREE.Mesh) => boolean) {
  let area = 0;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || skip?.(child)) return;
    const position = child.geometry.attributes.position as THREE.BufferAttribute;
    const index = child.geometry.index;
    const count = index ? index.count : position.count;
    for (let i = 0; i < count; i += 3) {
      a.fromBufferAttribute(position, index ? index.getX(i) : i);
      b.fromBufferAttribute(position, index ? index.getX(i + 1) : i + 1);
      c.fromBufferAttribute(position, index ? index.getX(i + 2) : i + 2);
      area += b.sub(a).cross(c.sub(a)).length() / 2;
    }
  });
  return area / 100;
}

// Size of what has to be printed, in mm, and how far it exceeds the printer bed.
function printExtent(settings: Settings, mode: Mode) {
  const { height, base, belly } = dims(settings);
  const attached = attachmentBounds(settings);
  const cat = settings.form === 'gato' ? catShape(settings) : null;
  let sizes: number[];
  if (mode === 'metade') {
    const layout = halfLayout(settings);
    const matrixZ = layout.ringTop - settings.plasterAbove + settings.plateThickness;
    sizes = [layout.width, layout.plateHeight, matrixZ];
    if (settings.printWalls) {
      const pad = 2 * (WALL_TOLERANCE + settings.wallThickness);
      sizes.push(layout.width + pad, layout.plateHeight + pad, layout.ringTop + settings.plateThickness);
    }
    const [x, y, z] = [layout.width, layout.plateHeight, matrixZ];
    return { x, y, z, overflow: Math.max(0, ...sizes.map((size) => size - USABLE)) };
  }
  const right = Math.max(belly, attached.maxX, cat?.earReach ?? 0);
  const left = Math.max(belly, -attached.minX, cat?.earReach ?? 0);
  const x = left + right;
  const y = Math.max(height + 1.5, attached.maxY, cat?.earTop ?? 0);
  const z = 2 * Math.max(belly, base * 1.04);
  sizes = [x, y, z];
  return { x, y, z, overflow: Math.max(0, ...sizes.map((size) => size - USABLE)) };
}

// Shrinks the main dimensions proportionally until the piece fits on the bed.
function fitToPrinter(settings: Settings, mode: Mode) {
  if (printExtent(settings, mode).overflow <= 0) return settings;
  const half = (value: number, min: number) => Math.max(min, Math.round(value * 2) / 2);
  const scaled = (s: number): Settings => ({
    ...settings,
    height: half(settings.height * s, 10),
    base: half(settings.base * s, 5),
    belly: half(settings.belly * s, 7),
    mouth: half(settings.mouth * s, 5),
    handle: half(settings.handle * s, 2),
  });
  let low = 0.3;
  let high = 1;
  for (let i = 0; i < 14; i++) {
    const mid = (low + high) / 2;
    if (printExtent(scaled(mid), mode).overflow <= 0) low = mid;
    else high = mid;
  }
  return scaled(low);
}

function downloadStl(object: THREE.Object3D, filename: string) {
  const data = new STLExporter().parse(object, { binary: true });
  const url = URL.createObjectURL(new Blob([data], { type: 'model/stl' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function App() {
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [mode, setMode] = useState<Mode>('completa');
  const [exported, setExported] = useState(false);
  const [category, setCategory] = useState<TextureCategory>('texturas');
  const [imageThumb, setImageThumb] = useState('');
  const [label, setLabel] = useState('1 xícara');
  const [imageError, setImageError] = useState('');
  const [product, setProduct] = useState<Product>('arquivo');
  const [areas, setAreas] = useState({ body: 0, walls: 0 });
  const [copied, setCopied] = useState(false);
  const [picking, setPicking] = useState(true);
  const [look, setLook] = useState<FinishLook>({ on: false, body: '#5f8fbf', inside: '#f3efe6', accent: '#7fa24a', sameAccent: true, gloss: 'brilho', ombre: false });
  const previewRef = useRef<THREE.Group | null>(null);
  const envRef = useRef<THREE.Texture | null>(null);
  const [notice, setNotice] = useState('');
  const noticeTimer = useRef(0);
  const latest = useRef({ settings, mode });
  latest.current = { settings, mode };
  const canvasHost = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const wallsRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const applyView = useCallback(() => {
    const host = canvasHost.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!host || !camera || !controls) return;
    const view = computeView(
      latest.current.settings,
      latest.current.mode,
      host.clientWidth / Math.max(1, host.clientHeight),
      host.clientWidth < 600,
    );
    camera.position.copy(view.position);
    controls.target.copy(view.target);
    controls.update();
  }, []);

  useEffect(() => {
    const host = canvasHost.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#e9e8e1');
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 2500);
    camera.position.set(340, 245, 390);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight('#fffaf0', '#64726c', 2.1));
    const keyLight = new THREE.DirectionalLight('#fff4e4', 3.2);
    keyLight.position.set(-180, 280, 210);
    keyLight.castShadow = true;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight('#dae9ec', 1.3);
    fillLight.position.set(170, 110, -160);
    scene.add(fillLight);

    const grid = new THREE.GridHelper(600, 30, '#aeb4ab', '#cdd0c8');
    grid.position.y = -3;
    const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
    gridMaterials.forEach((material) => {
      material.transparent = true;
      material.opacity = 0.46;
    });
    scene.add(grid);

    const model = new THREE.Group();
    const walls = new THREE.Group();
    const preview = new THREE.Group();
    preview.visible = false;
    scene.add(model, walls, preview);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    envRef.current = environment;
    previewRef.current = preview;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 180;
    controls.maxDistance = 900;
    controls.target.set(0, 90, 0);
    controls.update();

    sceneRef.current = scene;
    modelRef.current = model;
    wallsRef.current = walls;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;

    let compactView: boolean | null = null;
    const resize = new ResizeObserver(() => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      const compact = width < 600;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      if (compact !== compactView) {
        compactView = compact;
        applyView();
      }
    });
    resize.observe(host);

    let frame = 0;
    const draw = () => {
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      controls.dispose();
      disposeGroup(model);
      disposeGroup(walls);
      disposeGroup(preview);
      environment.dispose();
      envRef.current = null;
      previewRef.current = null;
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
      modelRef.current = null;
      wallsRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!modelRef.current || !cameraRef.current || !controlsRef.current) return;
    const model = modelRef.current;
    disposeGroup(model);
    if (mode === 'metade') makeHalf(settings, model);
    else makeVessel(settings, model);
    if (wallsRef.current) {
      disposeGroup(wallsRef.current);
      if (mode === 'metade' && settings.showWalls) makeWalls(settings, wallsRef.current);
    }
    controlsRef.current.target.copy(computeView(settings, mode, 1, false).target);
  }, [settings, mode]);

  useEffect(() => {
    const preview = previewRef.current;
    const model = modelRef.current;
    if (!preview || !model) return;
    disposeGroup(preview);
    if (look.on) {
      makeVessel(settings, preview, look, envRef.current);
      preview.scale.setScalar(1 / dims(settings).k);
    }
    preview.visible = look.on;
    model.visible = !look.on;
    if (wallsRef.current) wallsRef.current.visible = !look.on;
  }, [settings, mode, look]);

  useEffect(() => {
    if (!modelRef.current) return;
    let walls = 0;
    if (mode === 'metade') {
      const group = new THREE.Group();
      makeWalls(settings, group);
      walls = surfaceArea(group);
      disposeGroup(group);
    }
    setAreas({ body: surfaceArea(modelRef.current, (mesh) => Boolean(mesh.userData.plate)), walls });
  }, [settings, mode]);

  useEffect(() => {
    applyView();
  }, [mode, applyView]);

  function flash(message: string) {
    setNotice(message);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 4500);
  }

  // A change is refused when it would push the piece past the printer bed (unless it does not make things worse).
  function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    const current = latest.current.settings;
    const next = { ...current, [key]: value };
    if (key === 'volume' || key === 'cupWall' || key === 'cupStyle' || (key === 'foot' && isCup(next.form))) Object.assign(next, cupPatch(next));
    const { overflow } = printExtent(next, latest.current.mode);
    if (overflow > Math.max(0, printExtent(current, latest.current.mode).overflow)) {
      flash(`Limite da mesa da ${PRINTER.name} atingido (${PRINTER.bed} mm).`);
      return;
    }
    setSettings(next);
    setExported(false);
  }

  function chooseMode(next: Mode) {
    const current = latest.current.settings;
    const fitted = fitToPrinter(current, next);
    if (fitted !== current) {
      setSettings(fitted);
      flash(`Tamanho ajustado para caber na mesa da ${PRINTER.name}.`);
    }
    setMode(next);
    setExported(false);
  }

  function chooseMouth(item: (typeof MOUTHS)[number]) {
    const next = { ...latest.current.settings, mouthStyle: item.id, mouthBand: item.band, mouthOpen: item.open };
    setSettings(fitToPrinter(next, latest.current.mode));
    setExported(false);
  }

  function makeLid() {
    const current = latest.current.settings;
    const next = {
      ...current, form: 'tampa' as Form, ...presets.tampa, mouth: current.mouth,
      spoutType: 'nenhum' as SpoutType, mouthStyle: 'liso' as MouthStyle, petals: 0, petalTwist: 0, leaves: 0, rimWave: 0, foot: 0, figure: 'nenhum',
    };
    setSettings(fitToPrinter(next, latest.current.mode));
    setExported(false);
    flash('Tampa criada com o diâmetro da boca da peça.');
  }

  function chooseFlower(id: string) {
    const next = { ...latest.current.settings, ...FLOWER_STYLES[id].spec };
    Object.assign(next, cupPatch(next));
    const fitted = fitToPrinter(next, latest.current.mode);
    if (fitted !== next) flash(`Tamanho ajustado para caber na mesa da ${PRINTER.name}.`);
    setSettings(fitted);
    setExported(false);
  }

  function chooseForm(form: Form, extra: Partial<Settings> = {}) {
    const next = { ...latest.current.settings, form, ...presets[form] };
    if (form === 'colher') Object.assign(next, { volume: 5, cupStyle: 'baixo' as CupStyle });
    if (form === 'medidor') Object.assign(next, { volume: 240, cupStyle: 'conico' as CupStyle });
    if (form === 'flor') Object.assign(next, FLOWER_STYLES.delicada.spec);
    Object.assign(next, { spoutType: (form === 'bule' ? 'tubo' : 'nenhum') as SpoutType, spoutSize: 100, spoutCount: 1, spoutWidth: 100, spoutPos: 0, petalFull: false, mouthStyle: 'liso' as MouthStyle });
    Object.assign(next, form === 'flor' ? {} : form === 'pires' ? { petals: 8, petalDepth: 11, petalTwist: 0, leaves: 0, rimWave: 0, foot: 0 } : { petals: 0, petalTwist: 0, leaves: 0, rimWave: 0, foot: 0 });
    Object.assign(next, extra);
    if (isCup(form)) Object.assign(next, cupPatch(next));
    const fitted = fitToPrinter(next, latest.current.mode);
    if (fitted !== next) flash(`Tamanho ajustado para caber na mesa da ${PRINTER.name}.`);
    setSettings(fitted);
    setExported(false);
  }

  function engraveLabel() {
    const text = label.trim().slice(0, 24);
    if (!text) return;
    loadTextTexture(text);
    setImageError('');
    setImageThumb(imageThumbnail());
    setSettings((current) => {
      const size = Math.round(current.mouth * 10 * 0.8);
      return {
        ...current,
        pattern: 'imagem',
        single: true,
        engrave: false,
        imageInvert: false,
        imageThickness: 0,
        patternSize: Math.min(200, Math.max(15, size)),
        patternDepth: Math.min(1.2, Math.max(0.4, size / 60)),
        patternFrom: 25,
        patternTo: 75,
        imageVersion: current.imageVersion + 1,
      };
    });
    setExported(false);
  }

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    try {
      await loadImageTexture(file);
      setImageError('');
      setImageThumb(imageThumbnail());
      setSettings((current) => ({
        ...current,
        pattern: 'imagem',
        single: true,
        patternSize: Math.max(current.patternSize, 90),
        imageVersion: current.imageVersion + 1,
      }));
      setExported(false);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Não foi possível usar a imagem.');
    }
  }

  function exportStl() {
    if (!modelRef.current) return;
    downloadStl(modelRef.current, `${mode === 'metade' ? 'meia-matriz' : 'matriz'}-${settings.form}-${settings.height}cm.stl`);
    setExported(true);
    window.setTimeout(() => setExported(false), 2400);
  }

  function exportWalls() {
    const group = new THREE.Group();
    makeWalls(settings, group);
    downloadStl(group, `contencao-${settings.form}-${settings.height}cm.stl`);
    disposeGroup(group);
  }

  const matrix = dims(settings);
  const plate = halfLayout(settings);
  const plaster = plasterEstimate(settings);
  const plateSize = `${(plate.width / 10).toFixed(1)} × ${(plate.plateHeight / 10).toFixed(1)} cm`;
  const sizeDescription = mode === 'metade'
    ? `PLACA ${plateSize}`
    : `${(matrix.height / 10).toFixed(1)} × ${((matrix.belly * 2) / 10).toFixed(1)} cm`;
  const figureDef = figureById(settings.figure);
  const extent = printExtent(settings, mode);
  let sectionCount = 2;
  const nextSection = () => String(++sectionCount).padStart(2, '0');
  const catNo = settings.form === 'gato' ? nextSection() : '';
  const ranges = formRanges(settings.form);
  const handleNo = nextSection();
  const objectNo = nextSection();
  const patternNo = nextSection();
  const buildNo = nextSection();
  const ecoNo = mode === 'metade' ? nextSection() : '';
  const moldNo = mode === 'metade' ? nextSection() : '';
  const quoteNo = nextSection();
  const quoteInput = {
    bodyAreaCm2: areas.body,
    bodyVolumeCm3: mode === 'metade' ? plaster.matrixCm3 : 0,
    hollow: mode === 'completa' || settings.hollow,
    shellMm: mode === 'completa' ? settings.wall : settings.shellThickness,
    plateAreaCm2: mode === 'metade' ? (plate.width * plate.plateHeight) / 100 : 0,
    plateMm: settings.plateThickness,
    wallsAreaCm2: areas.walls,
    wallsMm: settings.wallThickness,
    printWalls: mode === 'metade' && settings.printWalls,
    halfPiece: mode === 'metade',
    customHandle: settings.handleStyle !== 'nenhuma' && settings.handleStyle !== 'alca',
    figure: Boolean(figureDef),
    texture: settings.pattern !== 'nenhum' && settings.pattern !== 'imagem',
    uploadedImage: settings.pattern === 'imagem',
  };
  const quote = calculateQuote({ ...quoteInput, product });
  const filamentGrams = calculateQuote({ ...quoteInput, product: 'impresso' }).grams;
  const whatsapp = import.meta.env.VITE_WHATSAPP_NUMBER;
  const [pixOpen, setPixOpen] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);
  const [pixQr, setPixQr] = useState('');
  const pixCode = pixPayload(quote.total);
  useEffect(() => {
    if (!pixOpen) return;
    void QRCode.toDataURL(pixCode, { margin: 1, width: 220 }).then(setPixQr);
  }, [pixOpen, pixCode]);
  function copyPix() {
    void navigator.clipboard.writeText(pixCode).then(() => {
      setPixCopied(true);
      window.setTimeout(() => setPixCopied(false), 2400);
    });
  }

  function requestOrder() {
    const handle = HANDLE_STYLES.find((item) => item.id === settings.handleStyle)?.label ?? '';
    const text = [
      'Pedido de matriz cerâmica',
      `Forma: ${settings.form} (${mode === 'metade' ? 'meia peça' : 'peça completa'})`,
      `Medidas queimadas: ${settings.height} cm de altura, ${settings.belly} cm de diâmetro, retração ${settings.shrink}%`,
      `Alça: ${handle}`,
      `Objeto: ${figureDef?.label ?? 'nenhum'}`,
      `Textura: ${textureLabel(settings.pattern) || 'nenhuma'}`,
      `Produto: ${product === 'arquivo' ? 'Arquivo STL' : 'Matriz impressa'}`,
      `Valor estimado: ${formatBRL(quote.total)}`,
    ].join('\n');
    if (whatsapp) {
      window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
      return;
    }
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    });
  }

  return (
    <main className="workspace">
      <header className="topbar">
        <a className="brand" href="#/" aria-label="Forma, página inicial">
          <span className="brand-mark"><Shapes size={19} strokeWidth={1.8} /></span>
          <span>forma<span className="brand-dot">.</span></span>
        </a>
        <div className="topbar-center"><span className="status-dot" /> ESTÚDIO DE MATRIZES <span className="topbar-divider">/</span> PROJETO 01</div>
        <div className="topbar-actions">
          <GoogleAuth />
          <button className="export-button" onClick={exportStl}>
            {exported ? <Check size={16} /> : <Download size={16} />}
            <span>{exported ? 'STL pronto' : 'Exportar STL'}</span>
          </button>
        </div>
      </header>

      <div className="editor" id="top">
        {picking && (
          <div className="picker-overlay" role="dialog" aria-label="Escolha o que criar">
            <div className="picker-box">
              <div className="eyebrow">COMECE POR AQUI</div>
              <h2>O que você quer criar?</h2>
              <p>Escolha uma forma. Depois é só ajustar medidas, alça, texturas e objetos.</p>
              <div className="picker-grid">
                {FORM_CARDS.map(({ id, label, text }) => (
                  <button key={id} className="picker-card" onClick={() => { chooseForm(id); setPicking(false); }}>
                    {id === 'gato' ? <Cat size={30} strokeWidth={1.5} /> : <span className={`form-icon ${id === 'jarra' ? 'pitcher' : id}-icon`}><i /></span>}
                    <strong>{label}</strong>
                    <span>{text}</span>
                  </button>
                ))}
              </div>
              <button className="picker-skip" onClick={() => setPicking(false)}>Continuar com a forma atual</button>
            </div>
          </div>
        )}
        <aside className="controls-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">CONFIGURADOR 3D</div>
              <h1>Sua próxima<br />forma começa aqui.</h1>
            </div>
            <button className="icon-button help-button" title="Sobre a matriz" aria-label="Sobre a matriz"><CircleHelp size={18} /></button>
          </div>

          <section className="control-section form-section">
            <div className="section-title"><span>01</span><h2>Escolha a forma</h2><button className="link-button" onClick={() => setPicking(true)}>Ver cartões</button></div>
            <div className="form-picker" role="group" aria-label="Tipo de peça">
              <button className={`form-option ${settings.form === 'jarra' ? 'selected' : ''}`} onClick={() => chooseForm('jarra')} aria-pressed={settings.form === 'jarra'}>
                <span className="form-icon pitcher-icon"><i /></span><span>Jarra</span>
              </button>
              <button className={`form-option ${settings.form === 'vaso' ? 'selected' : ''}`} onClick={() => chooseForm('vaso')} aria-pressed={settings.form === 'vaso'}>
                <span className="form-icon vase-icon"><i /></span><span>Vaso</span>
              </button>
              <button className={`form-option ${settings.form === 'copo' ? 'selected' : ''}`} onClick={() => chooseForm('copo')} aria-pressed={settings.form === 'copo'}>
                <span className="form-icon cup-icon"><i /></span><span>Copo</span>
              </button>
              <button className={`form-option ${settings.form === 'gato' ? 'selected' : ''}`} onClick={() => chooseForm('gato')} aria-pressed={settings.form === 'gato'}>
                <Cat size={22} strokeWidth={1.6} /><span>Gato</span>
              </button>
              {([['tigela', 'Tigela'], ['prato', 'Prato'], ['frasco', 'Frasco'], ['medidor', 'Medidor'], ['colher', 'Colher'], ['flor', 'Xícara flor'], ['pires', 'Pires flor'], ['bule', 'Bule'], ['acucareiro', 'Açucareiro'], ['tampa', 'Tampa']] as const).map(([id, label]) => (
                <button key={id} className={`form-option ${settings.form === id ? 'selected' : ''}`} onClick={() => chooseForm(id)} aria-pressed={settings.form === id}>
                  <span className={`form-icon ${id}-icon`}><i /></span><span>{label}</span>
                </button>
              ))}
            </div>
            <div className="slider-heading"><span>Modelos tradicionais</span></div>
            <div className="measure-grid" role="group" aria-label="Modelos tradicionais">
              {MODELS.map((model) => (
                <button key={model.id} className="measure-option" onClick={() => chooseForm(model.form, model.set)}>
                  <strong>{model.label}</strong><span>{model.text}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="control-section">
            <div className="section-title"><span>02</span><h2>Perfil da peça</h2><SlidersHorizontal size={14} /></div>
            {ranges.cup ? (
              <>
                {settings.form === 'flor' && <div className="measure-grid" role="group" aria-label="Estilo da flor">
                  {Object.entries(FLOWER_STYLES).map(([id, item]) => (
                    <button key={id} className={`measure-option ${settings.cupStyle === item.spec.cupStyle ? 'selected' : ''}`} aria-pressed={settings.cupStyle === item.spec.cupStyle} onClick={() => chooseFlower(id)}>
                      <strong>{item.label}</strong><span>{item.text}</span>
                    </button>
                  ))}
                </div>}
                {settings.form !== 'flor' && <div className="measure-grid" role="group" aria-label="Medida">
                  {(settings.form === 'colher' ? SPOONS : MEASURES).map((item) => (
                    <button key={item.label} className={`measure-option ${settings.volume === item.ml ? 'selected' : ''}`} aria-pressed={settings.volume === item.ml} onClick={() => { setLabel(item.label); updateSetting('volume', item.ml); }}>
                      <strong>{item.ml} ml</strong><span>{item.label}</span>
                    </button>
                  ))}
                </div>}
                {settings.form !== 'flor' && <div className="measure-grid" role="group" aria-label="Formato">
                  {(Object.keys(CUP_STYLES) as CupStyle[]).filter((id) => !['petala', 'tulipa', 'aberta'].includes(id)).map((id) => (
                    <button key={id} className={`measure-option ${settings.cupStyle === id ? 'selected' : ''}`} aria-pressed={settings.cupStyle === id} onClick={() => updateSetting('cupStyle', id)}>
                      <strong>{CUP_STYLES[id].label}</strong>
                    </button>
                  ))}
                </div>}
                {settings.form === 'medidor' && (
                  <div className="label-row">
                    <input value={label} maxLength={24} onChange={(event) => setLabel(event.target.value)} aria-label="Texto a gravar" />
                    <button className="secondary-button" onClick={engraveLabel}>Gravar texto</button>
                  </div>
                )}
                <Slider label="Capacidade" value={settings.volume} min={settings.form === 'colher' ? 1 : settings.form === 'flor' ? 50 : 5} max={settings.form === 'colher' ? 30 : settings.form === 'flor' ? 600 : 1000} step={settings.form === 'colher' ? 0.25 : settings.form === 'flor' ? 10 : 5} unit="ml" onChange={(value) => updateSetting('volume', value)} />
                <Slider label="Parede da peça queimada" value={settings.cupWall} min={3} max={8} step={0.5} unit="mm" onChange={(value) => updateSetting('cupWall', value)} />
                <p className="image-hint">Peça queimada de {(settings.mouth).toFixed(1)} cm de boca e {settings.height.toFixed(1)} cm de altura. A capacidade é calculada até a borda e varia um pouco com a espessura real da barbotina.</p>
              </>
            ) : (
              <>
                <Slider label="Altura" value={settings.height} min={ranges.height.min} max={ranges.height.max} step={0.5} unit="cm" onChange={(value) => updateSetting('height', value)} />
                {!ranges.lid && <Slider label="Diâmetro da base" value={settings.base} min={ranges.base.min} max={ranges.base.max} step={0.5} unit="cm" onChange={(value) => updateSetting('base', value)} />}
                {!ranges.roundBody && !ranges.lid && <Slider label="Maior diâmetro" value={settings.belly} min={ranges.belly.min} max={ranges.belly.max} step={0.5} unit="cm" onChange={(value) => updateSetting('belly', value)} />}
                <Slider label={ranges.lid ? 'Diâmetro da tampa' : 'Diâmetro da boca'} value={settings.mouth} min={ranges.lid ? 3 : ranges.mouth.min} max={ranges.mouth.max} step={0.5} unit="cm" onChange={(value) => updateSetting('mouth', value)} />
                {!ranges.roundBody && !ranges.lid && <Slider label="Posição do ventre" value={settings.bellyPos} min={35} max={70} unit="%" onChange={(value) => updateSetting('bellyPos', value)} />}
                {settings.form !== 'gato' && !ranges.lid && <Slider label="Borda (lábio)" value={settings.lip} min={1} max={15} unit="mm" onChange={(value) => updateSetting('lip', value)} />}
                {(settings.form === 'bule' || settings.form === 'acucareiro') && (
                  <button className="secondary-button" onClick={makeLid}>Criar a tampa desta peça</button>
                )}
              </>
            )}
            {!NO_SPOUT.includes(settings.form) && <>
              <div className="slider-heading"><span>Boca (acabamento)</span></div>
              <div className="measure-grid mouth-grid" role="group" aria-label="Formato da boca">
                {MOUTHS.map((item) => (
                  <button key={item.id} className={`measure-option ${settings.mouthStyle === item.id ? 'selected' : ''}`} aria-pressed={settings.mouthStyle === item.id} onClick={() => chooseMouth(item)}>
                    <strong>{item.label}</strong><span>{item.text}</span>
                  </button>
                ))}
              </div>
              {settings.mouthStyle !== 'liso' && <Slider label="Altura da boca" value={settings.mouthBand} min={5} max={70} unit="mm" onChange={(value) => updateSetting('mouthBand', value)} />}
              {FLARE_STYLES.includes(settings.mouthStyle) && <Slider label="Abertura" value={Math.abs(settings.mouthOpen)} min={5} max={70} unit="°" onChange={(value) => updateSetting('mouthOpen', settings.mouthStyle === 'fechado' ? -value : value)} />}
              <div className="slider-heading"><span>Bico para despejar</span></div>
              <div className="measure-grid" role="group" aria-label="Tipo de bocal">
                {SPOUTS.map((item) => (
                  <button key={item.id} className={`measure-option ${settings.spoutType === item.id ? 'selected' : ''}`} aria-pressed={settings.spoutType === item.id} onClick={() => updateSetting('spoutType', item.id)}>
                    <strong>{item.label}</strong><span>{item.text}</span>
                  </button>
                ))}
              </div>
              {settings.spoutType !== 'nenhum' && <Slider label="Tamanho do bocal" value={settings.spoutSize} min={50} max={180} step={5} unit="%" onChange={(value) => updateSetting('spoutSize', value)} />}
              {['labio', 'arredondado', 'bico'].includes(settings.spoutType) && <>
                <Slider label="Quantidade de bicos" value={settings.spoutCount} min={1} max={4} unit="" onChange={(value) => updateSetting('spoutCount', value)} />
                <Slider label="Largura do bico" value={settings.spoutWidth} min={50} max={200} step={5} unit="%" onChange={(value) => updateSetting('spoutWidth', value)} />
                <Slider label="Posição do bico" value={settings.spoutPos} min={0} max={360} step={5} unit="°" onChange={(value) => updateSetting('spoutPos', value)} />
              </>}
            </>}
            {settings.form !== 'gato' && <>
              <Slider label="Pétalas (0 = liso)" value={settings.petals} min={0} max={16} unit="" onChange={(value) => updateSetting('petals', value)} />
              {settings.petals >= 3 && <Slider label="Profundidade das pétalas" value={settings.petalDepth} min={2} max={30} unit="%" onChange={(value) => updateSetting('petalDepth', value)} />}
              {settings.petals >= 3 && <Slider label="Torção das pétalas" value={settings.petalTwist} min={0} max={180} unit="°" onChange={(value) => updateSetting('petalTwist', value)} />}
              {settings.petals >= 3 && <label className="toggle-row"><input type="checkbox" checked={settings.petalFull} onChange={(event) => updateSetting('petalFull', event.target.checked)} /> Lobos em toda a altura</label>}
              {settings.petals >= 3 && <Slider label="Borda ondulada" value={settings.rimWave} min={0} max={12} unit="mm" onChange={(value) => updateSetting('rimWave', value)} />}
              {!['gato', 'tampa', 'prato', 'pires', 'colher'].includes(settings.form) && <Slider label="Pé (pedestal)" value={settings.foot} min={0} max={30} unit="mm" onChange={(value) => updateSetting('foot', value)} />}
              {settings.form === 'flor' && <Slider label="Folhas na base (0 = sem)" value={settings.leaves} min={0} max={12} unit="" onChange={(value) => updateSetting('leaves', value)} />}
            </>}
            <Slider label="Retração da argila" value={settings.shrink} min={0} max={18} unit="%" onChange={(value) => updateSetting('shrink', value)} />
          </section>

          {settings.form === 'gato' && <section className="control-section handle-section">
            <div className="section-title"><span>{catNo}</span><h2>Orelhas e rosto</h2><SlidersHorizontal size={14} /></div>
            <Slider label="Altura das orelhas" value={settings.earHeight} min={2} max={8} unit="cm" onChange={(value) => updateSetting('earHeight', value)} />
            <Slider label="Inclinação das orelhas" value={settings.earTilt} min={0} max={40} unit="°" onChange={(value) => updateSetting('earTilt', value)} />
            <label className="toggle-row">
              <input type="checkbox" checked={settings.face} onChange={(event) => updateSetting('face', event.target.checked)} />
              <span>Rosto em baixo-relevo</span>
            </label>
          </section>}

          <section className="control-section handle-section">
            <div className="section-title"><span>{handleNo}</span><h2>Alça</h2><SlidersHorizontal size={14} /></div>
            <div className="texture-grid four" role="group" aria-label="Tipo de alça">
              {HANDLE_STYLES.map((item) => (
                <button key={item.id} className={`texture-option ${settings.handleStyle === item.id ? 'selected' : ''}`} aria-pressed={settings.handleStyle === item.id} onClick={() => updateSetting('handleStyle', item.id)}>
                  {item.id === 'nenhuma' ? <span className="option-empty" /> : <img src={handleThumbnail(item.id)} alt="" />}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
            {settings.handleStyle !== 'nenhuma' && <>
              <Slider label="Afastamento" value={settings.handle} min={2} max={12} unit="cm" onChange={(value) => updateSetting('handle', value)} />
              <Slider label="Altura de fixação" value={settings.handleHeight} min={40} max={95} unit="%" onChange={(value) => updateSetting('handleHeight', value)} />
              <Slider label="Extensão" value={settings.handleSpan} min={15} max={70} unit="%" onChange={(value) => updateSetting('handleSpan', value)} />
              <Slider label="Espessura" value={settings.handleThickness} min={5} max={14} unit="mm" onChange={(value) => updateSetting('handleThickness', value)} />
              <Slider label="Aproximar ao corpo" value={settings.handleSink} min={0} max={30} unit="mm" onChange={(value) => updateSetting('handleSink', value)} />
            </>}
          </section>

          <section className="control-section object-section">
            <div className="section-title"><span>{objectNo}</span><h2>Objetos aplicados</h2><SlidersHorizontal size={14} /></div>
            <div className="texture-grid" role="group" aria-label="Objetos">
              <button className={`texture-option ${settings.figure === 'nenhum' ? 'selected' : ''}`} aria-pressed={settings.figure === 'nenhum'} onClick={() => updateSetting('figure', 'nenhum')}>
                <span className="option-empty" /><span>Nenhum</span>
              </button>
              {FIGURES.map((item) => (
                <button key={item.id} className={`texture-option ${settings.figure === item.id ? 'selected' : ''}`} aria-pressed={settings.figure === item.id} onClick={() => updateSetting('figure', item.id)}>
                  <img src={figureThumbnail(item)} alt="" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
            {figureDef && <>
              <Slider label="Tamanho" value={settings.figureSize} min={15} max={80} unit="mm" onChange={(value) => updateSetting('figureSize', value)} />
              {figureDef.place === 'split' && <div className="segmented" role="group" aria-label="Posição do objeto">
                <button className={settings.figurePlace !== 'alca' ? 'selected' : ''} aria-pressed={settings.figurePlace !== 'alca'} onClick={() => updateSetting('figurePlace', 'borda')}>Na borda</button>
                <button className={settings.figurePlace === 'alca' ? 'selected' : ''} aria-pressed={settings.figurePlace === 'alca'} disabled={settings.handleStyle === 'nenhuma'} onClick={() => updateSetting('figurePlace', 'alca')}>Na alça</button>
              </div>}
              {figureDef.place === 'front' && !figureDef.onRim && <Slider label="Altura" value={settings.figureHeight} min={15} max={90} unit="%" onChange={(value) => updateSetting('figureHeight', value)} />}
            </>}
          </section>

          <section className="control-section pattern-section">
            <div className="section-title"><span>{patternNo}</span><h2>Texturas e efeitos</h2><SlidersHorizontal size={14} /></div>
            <div className="texture-tabs" role="tablist" aria-label="Categorias de textura">
              {TEXTURE_CATEGORIES.map((item) => (
                <button key={item.id} role="tab" aria-selected={category === item.id} className={`texture-tab ${category === item.id ? 'active' : ''}`} onClick={() => setCategory(item.id)}>{item.label}</button>
              ))}
            </div>
            {category === 'imagem' ? (
              <div className="image-texture">
                <label className="secondary-button upload-button">
                  <input type="file" accept="image/*" hidden onChange={(event) => { void uploadImage(event.target.files?.[0]); event.target.value = ''; }} />
                  Enviar imagem <Upload size={14} />
                </label>
                <p className="image-hint">As áreas escuras viram relevo. Silhuetas pretas em SVG ou PNG, com fundo transparente ou branco, funcionam bem.</p>
                {imageError && <p className="image-error" role="alert">{imageError}</p>}
                {imageThumb && <div className="texture-grid">
                  <button className={`texture-option ${settings.pattern === 'imagem' ? 'selected' : ''}`} aria-pressed={settings.pattern === 'imagem'} onClick={() => updateSetting('pattern', 'imagem')}>
                    <img src={imageThumb} alt="" />
                    <span>Sua imagem</span>
                  </button>
                </div>}
              </div>
            ) : (
              <div className="texture-grid" role="group" aria-label="Texturas">
                {texturesFor(category).map((item) => (
                  <button key={item.id} className={`texture-option ${settings.pattern === item.id ? 'selected' : ''}`} aria-pressed={settings.pattern === item.id} onClick={() => updateSetting('pattern', item.id)}>
                    <img src={textureThumbnail(item.id)} alt="" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
            {settings.pattern !== 'nenhum' && <>
              <div className="texture-current">
                <span>Aplicada: <strong>{textureLabel(settings.pattern)}</strong></span>
                <button className="link-button" onClick={() => updateSetting('pattern', 'nenhum')}>Remover</button>
              </div>
              <Slider label="Tamanho do motivo" value={settings.patternSize} min={10} max={120} unit="mm" onChange={(value) => updateSetting('patternSize', value)} />
              <Slider label="Profundidade" value={settings.patternDepth} min={1} max={4} step={0.5} unit="mm" onChange={(value) => updateSetting('patternDepth', value)} />
              <Slider label="Início da faixa" value={settings.patternFrom} min={5} max={70} unit="%" onChange={(value) => updateSetting('patternFrom', value)} />
              <Slider label="Fim da faixa" value={settings.patternTo} min={30} max={95} unit="%" onChange={(value) => updateSetting('patternTo', value)} />
              <div className="segmented" role="group" aria-label="Distribuição">
                <button className={!settings.single ? 'selected' : ''} aria-pressed={!settings.single} onClick={() => updateSetting('single', false)}>Repetir</button>
                <button className={settings.single ? 'selected' : ''} aria-pressed={settings.single} onClick={() => updateSetting('single', true)}>Único</button>
              </div>
              <div className="segmented" role="group" aria-label="Tipo de relevo">
                <button className={!settings.engrave ? 'selected' : ''} aria-pressed={!settings.engrave} onClick={() => updateSetting('engrave', false)}>Em relevo</button>
                <button className={settings.engrave ? 'selected' : ''} aria-pressed={settings.engrave} onClick={() => updateSetting('engrave', true)}>Gravado</button>
              </div>
              {settings.pattern === 'imagem' && <>
                <Slider label="Engrossar traço" value={settings.imageThickness} min={0} max={8} unit="px" onChange={(value) => updateSetting('imageThickness', value)} />
                <label className="toggle-row">
                  <input type="checkbox" checked={settings.imageInvert} onChange={(event) => updateSetting('imageInvert', event.target.checked)} />
                  <span>Inverter (claro vira relevo)</span>
                </label>
              </>}
            </>}
          </section>

          {mode === 'completa' ? <section className="control-section wall-section">
            <div className="section-title"><span>{buildNo}</span><h2>Construção</h2><SlidersHorizontal size={14} /></div>
            <Slider label="Espessura da parede" value={settings.wall} min={3} max={9} unit="mm" onChange={(value) => updateSetting('wall', value)} />
          </section> : <section className="control-section wall-section">
            <div className="section-title"><span>{buildNo}</span><h2>Placa e encaixes</h2><SlidersHorizontal size={14} /></div>
            <Slider label="Margem da placa" value={settings.plateMargin} min={2} max={6} unit="cm" onChange={(value) => updateSetting('plateMargin', value)} />
            <Slider label="Espessura da placa" value={settings.plateThickness} min={3} max={20} unit="mm" onChange={(value) => updateSetting('plateThickness', value)} />
          </section>}

          {mode === 'metade' && <section className="control-section eco-section">
            <div className="section-title"><span>{ecoNo}</span><h2>Economia de filamento</h2><SlidersHorizontal size={14} /></div>
            <label className="toggle-row eco-toggle">
              <input type="checkbox" checked={settings.hollow} onChange={(event) => updateSetting('hollow', event.target.checked)} />
              <span>Matriz oca com nervuras internas</span>
            </label>
            {settings.hollow && <>
              <Slider label="Espessura da casca" value={settings.shellThickness} min={1.6} max={4} step={0.4} unit="mm" onChange={(value) => updateSetting('shellThickness', value)} />
              <Slider label="Distância entre nervuras" value={settings.ribSpacing} min={15} max={40} unit="mm" onChange={(value) => updateSetting('ribSpacing', value)} />
            </>}
            <label className="toggle-row eco-toggle">
              <input type="checkbox" checked={settings.printWalls} onChange={(event) => updateSetting('printWalls', event.target.checked)} />
              <span>Imprimir a contenção (ou use placas de MDF ou PVC)</span>
            </label>
            <Slider label="Espessura da contenção" value={settings.wallThickness} min={2} max={5} step={0.5} unit="mm" onChange={(value) => updateSetting('wallThickness', value)} />
            <div className="estimate">
              <div className="estimate-title">FILAMENTO ESTIMADO</div>
              <div><span>Matriz + placa + contenção</span><strong>{Math.round(filamentGrams)} g</strong></div>
            </div>
            <p className="image-hint">{settings.hollow ? 'Fatie com 0% de preenchimento e 3 paredes: as nervuras seguram o teto. Só compensa com casca fina e nervuras afastadas.' : 'No fatiador use 3 paredes e preenchimento giroide de 5 a 8%.'} A placa pode ficar com 3 a 4 mm se apoiada numa superfície plana, e a contenção pode ser de MDF ou PVC.</p>
          </section>}

          {mode === 'metade' && <section className="control-section mold-section">
            <div className="section-title"><span>{moldNo}</span><h2>Molde de gesso</h2><SlidersHorizontal size={14} /></div>
            <Slider label="Reservatório de barbotina" value={settings.well} min={0} max={40} unit="mm" onChange={(value) => updateSetting('well', value)} />
            <Slider label="Gesso sobre a peça" value={settings.plasterAbove} min={20} max={50} unit="mm" onChange={(value) => updateSetting('plasterAbove', value)} />
            <Slider label="Água por 100 g de gesso" value={settings.waterRatio} min={60} max={90} unit="ml" onChange={(value) => updateSetting('waterRatio', value)} />
            <label className="toggle-row">
              <input type="checkbox" checked={settings.showWalls} onChange={(event) => updateSetting('showWalls', event.target.checked)} />
              <span>Mostrar paredes de contenção</span>
            </label>
            <div className="estimate" aria-label="Estimativa por metade do molde">
              <div className="estimate-title">ESTIMATIVA POR METADE</div>
              <div><span>Gesso</span><strong>{Math.round(plaster.plaster)} g</strong></div>
              <div><span>Água</span><strong>{Math.round(plaster.water)} ml</strong></div>
              <div><span>Volume</span><strong>{Math.round(plaster.slurry)} ml</strong></div>
            </div>
            <button className="secondary-button" onClick={exportWalls}>Exportar contenção (STL) <Download size={14} /></button>
          </section>}

          <section className="control-section quote-section">
            <div className="section-title"><span>{quoteNo}</span><h2>Orçamento</h2><SlidersHorizontal size={14} /></div>
            <div className="segmented" role="group" aria-label="Produto">
              <button className={product === 'arquivo' ? 'selected' : ''} aria-pressed={product === 'arquivo'} onClick={() => setProduct('arquivo')}>Arquivo STL</button>
              <button className={product === 'impresso' ? 'selected' : ''} aria-pressed={product === 'impresso'} onClick={() => setProduct('impresso')}>Matriz impressa</button>
            </div>
            <div className="quote-lines">
              {quote.lines.map((line) => <div key={line.label}><span>{line.label}</span><strong>{formatBRL(line.value)}</strong></div>)}
            </div>
            <div className="quote-total"><span>Total estimado</span><strong>{formatBRL(quote.total)}</strong></div>
            <button className="secondary-button" onClick={requestOrder}>{whatsapp ? 'Pedir pelo WhatsApp' : copied ? 'Resumo copiado' : 'Copiar resumo do pedido'}</button>
            <button className="secondary-button" onClick={() => setPixOpen((open) => !open)}>{pixOpen ? 'Ocultar Pix' : 'Pagar com Pix'}</button>
            {pixOpen && (
              <div className="pix-box">
                {pixQr && <img src={pixQr} alt="QR Code Pix" width={180} height={180} />}
                <button className="secondary-button" onClick={copyPix}>{pixCopied ? 'Código copiado' : 'Copiar Pix copia e cola'}</button>
                <p className="image-hint">Pix de {formatBRL(quote.total)}. Envie o comprovante junto do pedido.</p>
              </div>
            )}
            <p className="image-hint">Valor estimado a partir da peça montada. O orçamento final é confirmado no pedido.</p>
          </section>

          <div className="panel-footnote"><span className="footnote-line" /><p>{mode === 'metade' ? 'A metade sai sobre a placa, com a placa apoiada na mesa de impressão. Medidas em milímetros.' : 'As medidas do modelo exportado são em milímetros.'}</p></div>
        </aside>

        <section className="stage" aria-label="Pré-visualização 3D">
          <div className="stage-topline">
            <div className="tabs" role="tablist" aria-label="Modo de geração">
              <button role="tab" aria-selected={mode === 'completa'} className={`tab ${mode === 'completa' ? 'active' : ''}`} onClick={() => chooseMode('completa')}>PEÇA COMPLETA</button>
              <button role="tab" aria-selected={mode === 'metade'} className={`tab ${mode === 'metade' ? 'active' : ''}`} onClick={() => chooseMode('metade')}>MEIA PEÇA</button>
            </div>
            <div className="live-state"><span className="status-dot" /> ATUALIZADO</div>
          </div>
          <div className="canvas-wrap">
            <div className="canvas-label"><span className="label-square" /> {look.on ? 'PEÇA QUEIMADA E ESMALTADA' : mode === 'metade' ? 'MEIA MATRIZ' : 'MATRIZ POSITIVA'} <span className="label-separator">·</span> VISTA 3D</div>
            <div className="canvas-host" ref={canvasHost} />
            <button className={`finish-toggle ${look.on ? 'active' : ''}`} aria-pressed={look.on} onClick={() => setLook((current) => ({ ...current, on: !current.on }))}>
              {look.on ? 'Ver matriz' : 'Ver peça queimada e esmaltada'}
            </button>
            {look.on && (
              <div className="finish-panel">
                {([['body', 'Externa'], ['inside', 'Interna'], ['accent', 'Detalhes']] as const).map(([key, title]) => (
                  <div className="finish-row" key={key}>
                    <span>{title}</span>
                    <div className="swatches">
                      {GLAZE_COLORS.map((color) => (
                        <button key={color} className={look[key] === color ? 'selected' : ''} style={{ background: color }} aria-label={`${title} ${color}`} onClick={() => setLook((current) => ({ ...current, [key]: color, ...(key === 'accent' ? { sameAccent: false } : {}) }))} />
                      ))}
                      <input type="color" value={look[key]} aria-label={`${title}, cor personalizada`} onChange={(event) => setLook((current) => ({ ...current, [key]: event.target.value, ...(key === 'accent' ? { sameAccent: false } : {}) }))} />
                    </div>
                  </div>
                ))}
                <div className="finish-row">
                  <span>Acabamento</span>
                  <div className="segmented" role="group" aria-label="Acabamento">
                    {(['brilho', 'acetinado', 'fosco'] as const).map((gloss) => (
                      <button key={gloss} className={look.gloss === gloss ? 'selected' : ''} aria-pressed={look.gloss === gloss} onClick={() => setLook((current) => ({ ...current, gloss }))}>{gloss === 'brilho' ? 'Brilhante' : gloss === 'acetinado' ? 'Acetinado' : 'Fosco'}</button>
                    ))}
                  </div>
                </div>
                <div className="finish-checks">
                  <label className="toggle-row"><input type="checkbox" checked={look.ombre} onChange={(event) => setLook((current) => ({ ...current, ombre: event.target.checked }))} /> Degradê até a borda</label>
                  <label className="toggle-row"><input type="checkbox" checked={look.sameAccent} onChange={(event) => setLook((current) => ({ ...current, sameAccent: event.target.checked }))} /> Alça e detalhes na cor externa</label>
                </div>
                <p className="image-hint">Simula a peça no tamanho final, sem a retração. Cor e brilho são aproximados, e o esmalte real muda com a queima.</p>
              </div>
            )}
            <div className="dimensions dimension-height"><span />{((look.on ? matrix.height / matrix.k : matrix.height) / 10).toFixed(1)} cm</div>
            <div className="dimensions dimension-width">⟷ &nbsp;{look.on ? ((matrix.belly * 2) / matrix.k / 10).toFixed(1) : mode === 'metade' ? (plate.width / 10).toFixed(1) : ((matrix.belly * 2) / 10).toFixed(1)} cm</div>
            <button className="reset-view" onClick={applyView} title="Restaurar vista" aria-label="Restaurar vista"><RotateCcw size={15} /></button>
            <div className="view-cube"><span>TOP</span><i /><small>FRONT</small></div>
            <div className="canvas-caption"><span className="caption-index">A</span><span>{mode === 'metade' ? 'METADE SOBRE PLACA' : 'FORMA EXTERNA'}</span><span className="caption-rule" /><span>{sizeDescription}</span></div>
          </div>
          <div className="stage-footer">
            <div className="scale-readout"><Box size={15} /><span>MATRIZ COM RETRAÇÃO</span><strong>{(matrix.k * 100).toFixed(0)}%</strong></div>
            <div className="quote-chip"><span>VALOR ESTIMADO</span><strong>{formatBRL(quote.total)}</strong></div>
            <div className={`fit-chip ${extent.overflow > 0 ? 'over' : ''}`} title={`Mesa ${PRINTER.name}: ${PRINTER.bed} mm`}>
              <span>{notice || `${mode === 'metade' ? 'PLACA' : 'PEÇA'} ${extent.x.toFixed(0)} × ${extent.y.toFixed(0)} × ${extent.z.toFixed(0)} mm · ${extent.overflow > 0 ? 'NÃO CABE' : `CABE NA ${PRINTER.name.toUpperCase()}`}`}</span>
            </div>
            <div className="export-note"><span className="note-marker" /> STL · MALHA PARA IMPRESSÃO 3D</div>
            <button className="stage-export" onClick={exportStl}>{exported ? 'Arquivo preparado' : 'Gerar arquivo'} <Download size={15} /></button>
          </div>
        </section>
      </div>
      <footer className="bottom-bar"><span>FORMA STUDIO <span className="bottom-year">· 2026</span></span><span className="bottom-center">GERADOR PARAMÉTRICO <span>—</span> CERÂMICA</span><span className="version-label">BETA 01</span></footer>
    </main>
  );
}

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (value: number) => void;
};

function Slider({ label, value, min, max, step = 1, unit, onChange }: SliderProps) {
  const progress = ((value - min) / (max - min)) * 100;
  return (
    <label className="slider-control">
      <span className="slider-heading"><span>{label}</span><strong>{value}<small> {unit}</small></strong></span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--range-progress': `${progress}%` } as React.CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="slider-limits"><span>{min} {unit}</span><span>{max} {unit}</span></span>
    </label>
  );
}

export default App;