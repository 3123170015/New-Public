type DecimalLike = {
  equals: (other: DecimalLike) => boolean;
  mul: (n: number) => DecimalLike;
  div: (n: number) => DecimalLike;
  sub: (n: DecimalLike) => DecimalLike;
  add: (n: DecimalLike) => DecimalLike;
  greaterThanOrEqualTo: (n: DecimalLike) => boolean;
  lessThanOrEqualTo: (n: DecimalLike) => boolean;
};

export function withinTolerance(expected: DecimalLike, actual: DecimalLike, toleranceBps: number) {
  if (toleranceBps <= 0) return expected.equals(actual);
  const tol = expected.mul(toleranceBps).div(10000);
  const min = expected.sub(tol);
  const max = expected.add(tol);
  return actual.greaterThanOrEqualTo(min) && actual.lessThanOrEqualTo(max);
}
