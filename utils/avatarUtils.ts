import { createAvatar } from '@dicebear/core';
import * as personas from '@dicebear/personas';

const cache = new Map<string, string>();

export function getAvatarDataUri(seed: string): string {
  const cached = cache.get(seed);
  if (cached) return cached;

  const dataUri = createAvatar(personas, { seed, size: 128 }).toDataUri();
  cache.set(seed, dataUri);
  return dataUri;
}
