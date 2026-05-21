/**
 * Format a number as Indian Rupee currency.
 * Examples:
 *   formatINR(1500)       → "₹1,500"
 *   formatINR(22725.455)  → "₹22,726"
 *   formatINR(245000)     → "₹2,45,000"
 *   formatINR(0)          → "₹0"
 */
export function formatINR(value: number | null | undefined, decimals: number = 0): string {
  if (value == null || isNaN(value)) return '₹0';
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

/**
 * Compact format for large values (Cr / L / K).
 * Examples:
 *   formatINRCompact(15000000) → "₹1.5Cr"
 *   formatINRCompact(245000)   → "₹2.45L"
 *   formatINRCompact(8500)     → "₹8.5K"
 *   formatINRCompact(500)      → "₹500"
 */
export function formatINRCompact(value: number | null | undefined): string {
  if (value == null || isNaN(value) || value === 0) return '₹0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 10000000) {
    const v = abs / 10000000;
    return `${sign}₹${v % 1 === 0 ? v.toFixed(0) : v.toFixed(2).replace(/\.?0+$/, '')}Cr`;
  }
  if (abs >= 100000) {
    const v = abs / 100000;
    return `${sign}₹${v % 1 === 0 ? v.toFixed(0) : v.toFixed(2).replace(/\.?0+$/, '')}L`;
  }
  if (abs >= 1000) {
    const v = abs / 1000;
    return `${sign}₹${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1).replace(/\.?0+$/, '')}K`;
  }
  return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`;
}
