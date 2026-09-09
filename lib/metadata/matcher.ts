function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return new Set(normalizeTitle(value).split(" "));
}

function tokenSimilarity(
  a: string,
  b: string,
) {
  const aTokens = tokenize(a);
  const bTokens = tokenize(b);

  if (!aTokens.size || !bTokens.size) {
    return 0;
  }

  let intersection = 0;

  for (const token of aTokens) {
    if (bTokens.has(token)) {
      intersection++;
    }
  }

  const union = new Set([
    ...aTokens,
    ...bTokens,
  ]).size;

  return intersection / union;
}

export function calculateTitleScore(
  localTitle: string,
  candidateTitle: string,
) {
  const local = normalizeTitle(localTitle);
  const candidate = normalizeTitle(candidateTitle);

  if (local === candidate) {
    return 1;
  }

  if (
    candidate.includes(local) ||
    local.includes(candidate)
  ) {
    return 0.9;
  }

  return tokenSimilarity(local, candidate);
}

export function calculateMatchScore({
  localTitle,
  localYear,
  candidateTitle,
  candidateYear,
}: {
  localTitle: string;
  localYear?: number | null;
  candidateTitle: string;
  candidateYear?: number | null;
}) {
  let score = calculateTitleScore(
    localTitle,
    candidateTitle,
  );

  if (
    localYear &&
    candidateYear
  ) {
    const difference = Math.abs(
      localYear - candidateYear,
    );

    if (difference === 0) {
      score += 0.15;
    } else if (difference === 1) {
      score += 0.05;
    } else if (difference >= 3) {
      score -= 0.2;
    }
  }

  return Math.max(
    0,
    Math.min(1, score),
  );
}