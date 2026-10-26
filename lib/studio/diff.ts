/*
 * Line diffs for the code editor's drafts: what changed, as hunks to show, and as a unified patch a developer can
 * apply with `git apply`. Longest-common-subsequence on lines, which is plenty for one source file.
 */

export type DiffLine = { kind: " " | "-" | "+"; text: string; a?: number; b?: number };
export interface Hunk { aStart: number; aLen: number; bStart: number; bLen: number; lines: DiffLine[] }

export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split("\n"), b = after.split("\n");
  // Trim the shared start and end so the table stays small.
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length, endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB--; }
  const A = a.slice(start, endA), B = b.slice(start, endB);
  const lcs = Array.from({ length: A.length + 1 }, () => new Uint32Array(B.length + 1));
  for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--) lcs[i][j] = A[i] === B[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const out: DiffLine[] = a.slice(0, start).map((text, i) => ({ kind: " ", text, a: i + 1, b: i + 1 }));
  let i = 0, j = 0;
  while (i < A.length || j < B.length) {
    if (i < A.length && j < B.length && A[i] === B[j]) { out.push({ kind: " ", text: A[i], a: start + i + 1, b: start + j + 1 }); i++; j++; }
    else if (j < B.length && (i >= A.length || lcs[i][j + 1] >= lcs[i + 1][j])) { out.push({ kind: "+", text: B[j], b: start + j + 1 }); j++; }
    else { out.push({ kind: "-", text: A[i], a: start + i + 1 }); i++; }
  }
  a.slice(endA).forEach((text, k) => out.push({ kind: " ", text, a: endA + k + 1, b: endB + k + 1 }));
  return out;
}

/** The changed lines with a few lines of context around each change. */
export function hunks(lines: DiffLine[], context = 3): Hunk[] {
  const out: Hunk[] = [];
  const changed = lines.map((l, i) => (l.kind !== " " ? i : -1)).filter((i) => i >= 0);
  let k = 0;
  while (k < changed.length) {
    let from = Math.max(0, changed[k] - context), to = Math.min(lines.length - 1, changed[k] + context);
    while (k + 1 < changed.length && changed[k + 1] - context <= to + 1) { k++; to = Math.min(lines.length - 1, changed[k] + context); }
    const part = lines.slice(from, to + 1);
    const firstA = part.find((l) => l.a !== undefined)?.a ?? (lines.slice(0, from).filter((l) => l.a !== undefined).pop()?.a ?? 0);
    const firstB = part.find((l) => l.b !== undefined)?.b ?? (lines.slice(0, from).filter((l) => l.b !== undefined).pop()?.b ?? 0);
    out.push({ aStart: firstA, aLen: part.filter((l) => l.kind !== "+").length, bStart: firstB, bLen: part.filter((l) => l.kind !== "-").length, lines: part });
    k++;
    from = to;
  }
  return out;
}

export function unifiedPatch(path: string, before: string, after: string) {
  const hs = hunks(diffLines(before, after));
  if (!hs.length) return "";
  return [`diff --git a/${path} b/${path}`, `--- a/${path}`, `+++ b/${path}`,
    ...hs.flatMap((h) => [`@@ -${h.aStart},${h.aLen} +${h.bStart},${h.bLen} @@`, ...h.lines.map((l) => `${l.kind}${l.text}`)])].join("\n") + "\n";
}
