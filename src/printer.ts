// Print volume of the printer the shop uses; change these to support another model.
export const PRINTER = {
  name: 'Bambu Lab A1',
  bed: 256,
  // Margin kept on each edge for the purge line, brim and tolerance.
  edge: 2,
} as const;

export const USABLE = PRINTER.bed - 2 * PRINTER.edge;
