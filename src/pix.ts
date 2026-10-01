export const PIX_KEY = 'palomaeveir@gmail.com';
const MERCHANT_NAME = 'FORMA STUDIO';
const MERCHANT_CITY = 'BRASIL';

function field(id: string, value: string) {
  return id + String(value.length).padStart(2, '0') + value;
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Static Pix "copia e cola" (BR Code) with a fixed amount.
export function pixPayload(amount: number) {
  const body =
    field('00', '01') +
    field('26', field('00', 'br.gov.bcb.pix') + field('01', PIX_KEY)) +
    field('52', '0000') +
    field('53', '986') +
    field('54', amount.toFixed(2)) +
    field('58', 'BR') +
    field('59', MERCHANT_NAME) +
    field('60', MERCHANT_CITY) +
    field('62', field('05', '***')) +
    '6304';
  return body + crc16(body);
}
