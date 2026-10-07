import { createHash, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

const KEY_LEN = 64;
const PREFIX = "scrypt$";

// Stored as `scrypt$<saltHex>$<hashHex>`
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LEN);
  return `${PREFIX}${salt.toString("hex")}$${hash.toString("hex")}`;
}

// `needsRehash` flags legacy unsalted SHA-256 hashes so callers can upgrade them on successful login.
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<{ ok: boolean; needsRehash: boolean }> {
  if (stored.startsWith(PREFIX)) {
    const [saltHex, hashHex] = stored.slice(PREFIX.length).split("$");
    const expected = Buffer.from(hashHex, "hex");
    const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length);
    return { ok: timingSafeEqual(actual, expected), needsRehash: false };
  }
  const legacy = Buffer.from(createHash("sha256").update(password).digest("hex"));
  const storedBuf = Buffer.from(stored);
  const ok = legacy.length === storedBuf.length && timingSafeEqual(legacy, storedBuf);
  return { ok, needsRehash: ok };
}
