import { createAvatar } from '@dicebear/core';
import * as personas from '@dicebear/personas';
import { AvatarConfig } from '../types';

const cache = new Map<string, string>();

export function getAvatarDataUri(seed: string): string {
  const cached = cache.get(seed);
  if (cached) return cached;

  const dataUri = createAvatar(personas, { seed, size: 128 }).toDataUri();
  cache.set(seed, dataUri);
  return dataUri;
}

export function getAvatarDataUriFromConfig(config: AvatarConfig, seed = 'preview'): string {
  const cacheKey = `config:${seed}:${JSON.stringify(config)}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // AvatarConfig deliberately stores plain strings (values always come from
  // AVATAR_OPTIONS below), so cast past DiceBear's literal-union option types.
  const dataUri = createAvatar(personas, {
    seed,
    size: 128,
    hair: [config.hair],
    hairColor: [config.hairColor],
    eyes: [config.eyes],
    mouth: [config.mouth],
    nose: [config.nose],
    facialHair: config.facialHair ? [config.facialHair] : [],
    facialHairProbability: config.facialHair ? 100 : 0,
    skinColor: [config.skinColor],
    clothingColor: [config.clothingColor],
    body: [config.body],
  } as personas.Options).toDataUri();

  cache.set(cacheKey, dataUri);
  return dataUri;
}

// Every option the "personas" style supports, straight from its schema —
// used to build the trait-by-trait avatar editor.
export const AVATAR_OPTIONS = {
  hair: ['long', 'sideShave', 'shortCombover', 'curlyHighTop', 'bobCut', 'curly', 'pigtails', 'curlyBun', 'buzzcut', 'bobBangs', 'bald', 'balding', 'cap', 'bunUndercut', 'fade', 'beanie', 'straightBun', 'extraLong', 'shortComboverChops', 'mohawk'] as const,
  eyes: ['open', 'sleep', 'wink', 'glasses', 'happy', 'sunglasses'] as const,
  mouth: ['smile', 'frown', 'surprise', 'pacifier', 'bigSmile', 'smirk', 'lips'] as const,
  nose: ['mediumRound', 'smallRound', 'wrinkles'] as const,
  facialHair: ['beardMustache', 'pyramid', 'walrus', 'goatee', 'shadow', 'soulPatch'] as const,
  body: ['squared', 'rounded', 'small', 'checkered'] as const,
  hairColor: ['362c47', '6c4545', 'e15c66', 'e16381', 'f27d65', 'f29c65', 'dee1f5'] as const,
  clothingColor: ['456dff', '54d7c7', '7555ca', '6dbb58', 'e24553', 'f3b63a', 'f55d81'] as const,
  skinColor: ['eeb4a4', 'e7a391', 'e5a07e', 'd78774', 'b16a5b', '92594b', '623d36'] as const,
};

// Human-readable PT-BR labels for the raw DiceBear option values.
export const AVATAR_LABELS: Record<string, string> = {
  // hair
  long: 'Longo', sideShave: 'Raspado Lateral', shortCombover: 'Social Curto', curlyHighTop: 'Topete Cacheado',
  bobCut: 'Chanel', curly: 'Cacheado', pigtails: 'Maria-chiquinha', curlyBun: 'Coque Cacheado',
  buzzcut: 'Raspado', bobBangs: 'Chanel c/ Franja', bald: 'Careca', balding: 'Entradas',
  cap: 'Boné', bunUndercut: 'Coque Undercut', fade: 'Degradê', beanie: 'Gorro',
  straightBun: 'Coque Liso', extraLong: 'Extra Longo', shortComboverChops: 'Social c/ Costeleta', mohawk: 'Moicano',
  // eyes
  open: 'Abertos', sleep: 'Sonolentos', wink: 'Piscando', glasses: 'Óculos', happy: 'Felizes', sunglasses: 'Óculos de Sol',
  // mouth
  smile: 'Sorriso', frown: 'Bravo', surprise: 'Surpreso', pacifier: 'Chupeta', bigSmile: 'Sorrisão', smirk: 'Sorriso Torto', lips: 'Lábios',
  // nose
  mediumRound: 'Médio', smallRound: 'Pequeno', wrinkles: 'Marcado',
  // facialHair
  beardMustache: 'Barba Completa', pyramid: 'Cavanhaque Piramidal', walrus: 'Bigode Farto', goatee: 'Cavanhaque', shadow: 'Barba Rala', soulPatch: 'Mosca',
  // body
  squared: 'Quadrado', rounded: 'Arredondado', small: 'Pequeno', checkered: 'Xadrez',
};

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function randomAvatarConfig(): AvatarConfig {
  return {
    hair: pick(AVATAR_OPTIONS.hair),
    hairColor: pick(AVATAR_OPTIONS.hairColor),
    eyes: pick(AVATAR_OPTIONS.eyes),
    mouth: pick(AVATAR_OPTIONS.mouth),
    nose: pick(AVATAR_OPTIONS.nose),
    facialHair: Math.random() < 0.3 ? pick(AVATAR_OPTIONS.facialHair) : null,
    skinColor: pick(AVATAR_OPTIONS.skinColor),
    clothingColor: pick(AVATAR_OPTIONS.clothingColor),
    body: pick(AVATAR_OPTIONS.body),
  };
}
