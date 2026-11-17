import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { UserModel } from "../models/User";

const CODE_COUNT = 8;

// One-time 2FA recovery codes, shown to the admin once. Stored as bcrypt hashes.
export async function generateRecoveryCodes(): Promise<{ codes: string[]; hashes: string[] }> {
  const codes = Array.from({ length: CODE_COUNT }, () => {
    const hex = randomBytes(5).toString("hex");
    return `${hex.slice(0, 5)}-${hex.slice(5)}`;
  });
  const hashes = await Promise.all(codes.map((c) => bcrypt.hash(c, 10)));
  return { codes, hashes };
}

export function looksLikeRecoveryCode(input: string): boolean {
  return /^[0-9a-f]{5}-[0-9a-f]{5}$/.test(input.trim().toLowerCase());
}

// Consumes a matching recovery code. The $pull is conditional on the hash
// still being present, so the same code cannot be used twice concurrently.
export async function consumeRecoveryCode(userId: string, hashes: string[], input: string): Promise<boolean> {
  const code = input.trim().toLowerCase();
  for (const hash of hashes) {
    if (await bcrypt.compare(code, hash)) {
      const res = await UserModel.updateOne(
        { id: userId, recoveryCodeHashes: hash },
        { $pull: { recoveryCodeHashes: hash } }
      );
      return res.modifiedCount === 1;
    }
  }
  return false;
}
