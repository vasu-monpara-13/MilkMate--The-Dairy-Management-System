export type PayoutConfig = {
  basePerLitre: number;     // base milk price per litre
  fatRate: number;          // extra ₹ per FAT point per litre
  snfRate: number;          // extra ₹ per SNF point per litre
  bonusAboveFat?: { fat: number; bonusPerLitre: number }; // optional premium milk bonus
};

export const DEFAULT_PAYOUT: PayoutConfig = {
  basePerLitre: 28,
  fatRate: 1.6,
  snfRate: 1.0,
  bonusAboveFat: { fat: 6.0, bonusPerLitre: 2.0 },
};

export function calcPayout(
  litres: number,
  fat: number,
  snf: number,
  cfg: PayoutConfig = DEFAULT_PAYOUT
) {
  const L = clamp(litres, 0, 5000);
  const F = clamp(fat, 0, 12);
  const S = clamp(snf, 0, 12);

  const base = cfg.basePerLitre;
  const variable = F * cfg.fatRate + S * cfg.snfRate;

  const bonus =
    cfg.bonusAboveFat && F >= cfg.bonusAboveFat.fat ? cfg.bonusAboveFat.bonusPerLitre : 0;

  const perLitre = base + variable + bonus;
  const total = perLitre * L;

  return {
    litres: L,
    fat: F,
    snf: S,
    perLitre: round2(perLitre),
    total: round2(total),
    breakdown: {
      base: round2(base),
      fatComponent: round2(F * cfg.fatRate),
      snfComponent: round2(S * cfg.snfRate),
      bonus: round2(bonus),
    },
  };
}

function clamp(n: number, a: number, b: number) {
  if (Number.isNaN(n)) return a;
  return Math.max(a, Math.min(b, n));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}