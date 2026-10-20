import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Password hashing on the standard library. scrypt is a memory-hard KDF and
 * `node:crypto` ships it, so there is no bcrypt/argon2 dependency here.
 *
 * ponytail: N=2^15 sits below OWASP's N=2^17 floor on purpose. 2^17 costs
 * ~134 MB per hash, and with no rate limiting on /auth/login (deliberately out
 * of scope) an expensive KDF is itself a memory-exhaustion lever. Raise N when
 * throttling lands — stored digests carry the parameters they were made with,
 * so old passwords keep verifying.
 */
const N = 2 ** 15,
  KEY_LENGTH = 64,
  P = 1,
  R = 8,
  SALT_BYTES = 16;

const derive = (plain: string, salt: string, n: number, r: number, p: number) =>
  new Promise<Buffer>((resolve, reject) => {
    // maxmem is derived from the parameters rather than fixed. 128*N*r is the
    // requirement, and at these parameters that is 32 MiB — the whole of Node's
    // default budget, so the derived headroom is what makes the call work at all
    // and a fixed ceiling would reject the next cost increase outright.
    scrypt(plain, salt, KEY_LENGTH, { N: n, r, p, maxmem: 128 * n * r * 2 }, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });

/** `scrypt$N$r$p$salt$digest`, all hex. The parameters travel with the digest. */
export const hashPassword = async (plain: string): Promise<string> => {
  const salt = randomBytes(SALT_BYTES).toString("hex"),
    key = await derive(plain, salt, N, R, P);

  return ["scrypt", N, R, P, salt, key.toString("hex")].join("$");
};

export const verifyPassword = async (plain: string, stored: string): Promise<boolean> => {
  const [scheme, n, r, p, salt, digest] = stored.split("$");

  if (scheme !== "scrypt" || !salt || !digest) return false;

  const params = [n, r, p].map(Number);
  if (params.some((value) => !Number.isInteger(value) || value < 1)) return false;

  try {
    const key = await derive(plain, salt, params[0], params[1], params[2]),
      expected = Buffer.from(digest, "hex");

    // timingSafeEqual throws RangeError on a length mismatch, which would turn a
    // malformed column value into a 500 instead of a failed login.
    return key.length === expected.length && timingSafeEqual(key, expected);
  } catch {
    // A stored value can be syntactically fine and still unusable — scrypt
    // rejects an N that is not a power of two, for one. A corrupt column is a
    // failed login, never a 500, because a 500 here tells the caller that this
    // account exists.
    return false;
  }
};

/**
 * A digest of a value nobody can present. Verifying against it costs the same as
 * verifying a real one, so a login with an unknown email takes as long as a
 * login with a known one.
 *
 * Computed once. A rejection is NOT kept: caching a failed promise would make
 * every later unknown-email login throw while known emails still answered 401,
 * which is exactly the difference this exists to erase. Warmed at startup, so
 * the first such login does not pay for the hash and stand out by doing so.
 */
let decoy: Promise<string> | undefined;

export const decoyDigest = (): Promise<string> =>
  (decoy ??= hashPassword(randomBytes(32).toString("hex")).catch((error: unknown) => {
    decoy = undefined;
    throw error;
  }));
