// Example prices in BRL: replace with your real costs and margins.
export const PRICING = {
  currency: 'BRL',
  printed: {
    filamentPerGram: 0.12,
    densityGramsPerCm3: 1.24,
    // Slicer assumptions: sparse infill fraction, perimeter width (3 lines) and solid top/bottom layers, in mm.
    infill: 0.08,
    perimeterMm: 1.2,
    solidLayersMm: 3.2,
    wallsFill: 0.8,
    gramsPerHour: 18,
    machinePerHour: 6,
    packaging: 8,
    margin: 0.4,
    minimum: 39,
  },
  digital: {
    base: 29,
    halfPiece: 20,
    customHandle: 5,
    figure: 8,
    texture: 6,
    uploadedImage: 10,
  },
} as const;

export type Product = 'arquivo' | 'impresso';

export type QuoteInput = {
  product: Product;
  bodyAreaCm2: number;
  bodyVolumeCm3: number;
  hollow: boolean;
  shellMm: number;
  plateAreaCm2: number;
  plateMm: number;
  wallsAreaCm2: number;
  wallsMm: number;
  printWalls: boolean;
  halfPiece: boolean;
  customHandle: boolean;
  figure: boolean;
  texture: boolean;
  uploadedImage: boolean;
};

export type Quote = { lines: { label: string; value: number }[]; total: number; grams: number };

export function calculateQuote(input: QuoteInput): Quote {
  const lines: { label: string; value: number }[] = [];
  if (input.product === 'arquivo') {
    const p = PRICING.digital;
    lines.push({ label: 'Arquivo STL da forma', value: p.base });
    if (input.halfPiece) lines.push({ label: 'Meia peça com placa e chaves', value: p.halfPiece });
    if (input.customHandle) lines.push({ label: 'Alça especial', value: p.customHandle });
    if (input.figure) lines.push({ label: 'Objeto aplicado', value: p.figure });
    if (input.texture) lines.push({ label: 'Textura', value: p.texture });
    if (input.uploadedImage) lines.push({ label: 'Imagem própria', value: p.uploadedImage });
    return { lines, total: lines.reduce((sum, line) => sum + line.value, 0), grams: 0 };
  }
  const p = PRICING.printed;
  // A hollow body is a thin shell: its surface is counted on both sides, so the material is half of area times thickness.
  const body = input.hollow
    ? (input.bodyAreaCm2 / 2) * (input.shellMm / 10)
    : input.bodyVolumeCm3 * p.infill + input.bodyAreaCm2 * (p.perimeterMm / 10);
  const plate = input.plateAreaCm2 * ((Math.min(input.plateMm, p.solidLayersMm) + Math.max(0, input.plateMm - p.solidLayersMm) * p.infill) / 10);
  const walls = input.printWalls ? ((input.wallsAreaCm2 / 2) * input.wallsMm * p.wallsFill) / 10 : 0;
  const grams = (body + plate + walls) * p.densityGramsPerCm3;
  const hours = grams / p.gramsPerHour;
  const material = grams * p.filamentPerGram;
  const machine = hours * p.machinePerHour;
  const cost = material + machine + p.packaging;
  const margin = cost * p.margin;
  lines.push({ label: `Material (${Math.round(grams)} g)`, value: material });
  lines.push({ label: `Impressão (${hours.toFixed(1)} h)`, value: machine });
  lines.push({ label: 'Embalagem', value: p.packaging });
  lines.push({ label: 'Margem', value: margin });
  const subtotal = cost + margin;
  if (subtotal < p.minimum) lines.push({ label: 'Ajuste ao pedido mínimo', value: p.minimum - subtotal });
  return { lines, total: Math.max(subtotal, p.minimum), grams };
}

export const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: PRICING.currency }).format(value);
