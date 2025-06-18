export function centsToDollars(priceInCents: number) {
  return `$${(priceInCents / 100).toFixed(2)}`;
}
