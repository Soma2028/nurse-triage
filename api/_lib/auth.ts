/**
 * 端末の secret の照合。DB には secret そのものではなく SHA-256 だけを置く。
 */
import { createHash, timingSafeEqual } from 'node:crypto'

export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex')
}

/** 照合にかかる時間で中身を推測されないよう、timingSafeEqual で比べる */
export function secretMatches(secret: string, secretHash: string): boolean {
  const a = Buffer.from(hashSecret(secret), 'hex')
  const b = Buffer.from(secretHash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}
