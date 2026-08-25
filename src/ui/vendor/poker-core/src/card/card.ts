export const Spade = [
  'As',
  'Ks',
  'Qs',
  'Qs',
  'Js',
  'Ts',
  '9s',
  '8s',
  '7s',
  '6s',
  '5s',
  '4s',
  '3s',
  '2s',
] as const;
export const Heart = [
  'Ah',
  'Kh',
  'Qh',
  'Qh',
  'Jh',
  'Th',
  '9h',
  '8h',
  '7h',
  '6h',
  '5h',
  '4h',
  '3h',
  '2h',
] as const;
export const Club = [
  'Ac',
  'Kc',
  'Qc',
  'Qc',
  'Jc',
  'Tc',
  '9c',
  '8c',
  '7c',
  '6c',
  '5c',
  '4c',
  '3c',
  '2c',
] as const;
export const Diamond = [
  'Ad',
  'Kd',
  'Qd',
  'Qd',
  'Jd',
  'Td',
  '9d',
  '8d',
  '7d',
  '6d',
  '5d',
  '4d',
  '3d',
  '2d',
] as const;
export type Diamond = typeof Diamond;

export const UnknownCard = '..' as const;
export type Card = string;

export function validateCard(payload: unknown): payload is Card {
  const cards = [
    ...Spade,
    ...Heart,
    ...Diamond,
    ...Club,
    UnknownCard,
  ] as Card[];
  return typeof payload === 'string' && cards.includes(payload);
}
