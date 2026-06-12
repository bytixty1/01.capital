// Number and currency formatting for 01 Capital.
//
// CLAUDE.md rule 5: never hardcode currency symbols at call sites. Every SAR
// amount and share count flows through these helpers so locale behaviour is
// deterministic today and Arabic/RTL formatting can be added in one place
// later without touching call sites.

const NUMBER_LOCALE = 'en-SA';

/** Today as YYYY-MM-DD (UTC) — the wire format for all date fields. */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatNumber(value: number | string, options?: Intl.NumberFormatOptions): string {
  return Number(value).toLocaleString(NUMBER_LOCALE, options);
}

export function formatSAR(value: number | string, options?: Intl.NumberFormatOptions): string {
  return `SAR ${formatNumber(value, options)}`;
}

// Whole-unit display (no fraction digits) — used for valuations, distributions,
// and share counts where decimals are noise.
export function formatNumberWhole(value: number | string): string {
  return formatNumber(value, { maximumFractionDigits: 0 });
}

export function formatSARWhole(value: number | string): string {
  return formatSAR(value, { maximumFractionDigits: 0 });
}
