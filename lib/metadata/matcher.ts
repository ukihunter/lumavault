// lib/metadata/matcher.ts

function normalizeTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/\(\d{4}\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(
  a: string,
  b: string,
) {
  const first = normalizeTitle(a);
  const second = normalizeTitle(b);

  if (first === second) {
    return 1;
  }

  const firstWords = new Set(first.split(" "));
  const secondWords = new Set(second.split(" "));

  const intersection = [...firstWords].filter(
    (word) => secondWords.has(word),
  );

  const union = new Set([
    ...firstWords,
    ...secondWords,
  ]);

  return intersection.length / union.size;
}

export function calculateMatchScore(
  localTitle: string,
  localYear: number | null | undefined,
  tmdbTitle: string,
  tmdbYear: number | null | undefined,
) {
  const titleScore = similarity(
    localTitle,
    tmdbTitle,
  );

  if (
    localYear &&
    tmdbYear &&
    localYear === tmdbYear
  ) {
    return Math.min(1, titleScore + 0.15);
  }

  return titleScore;
}