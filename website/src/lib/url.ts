export function withBase(input: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return base + '/' + input.replace(/^\/+/, '');
}
