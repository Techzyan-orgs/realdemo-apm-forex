/** Seed metadata for supported currencies (seed_data.currencies). Rates come from the feed. */
export type CurrencyMeta = { code: string; name: string; symbol: string; flag: string; fallbackRefRate: number };

// fallbackRefRate = approx INR per unit, used only when the feed is unreachable at seed time.
export const CURRENCY_META: CurrencyMeta[] = [
  { code: "USD", name: "US Dollar", symbol: "$", flag: "US", fallbackRefRate: 88.5 },
  { code: "EUR", name: "Euro", symbol: "€", flag: "EU", fallbackRefRate: 102.5 },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "GB", fallbackRefRate: 117 },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", flag: "AE", fallbackRefRate: 24.1 },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", flag: "SG", fallbackRefRate: 68 },
  { code: "THB", name: "Thai Baht", symbol: "฿", flag: "TH", fallbackRefRate: 2.7 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", flag: "AU", fallbackRefRate: 57.5 },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", flag: "CA", fallbackRefRate: 63 },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", flag: "CH", fallbackRefRate: 110 },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", flag: "JP", fallbackRefRate: 0.58 },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", flag: "SA", fallbackRefRate: 23.6 },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", flag: "MY", fallbackRefRate: 21 },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", flag: "HK", fallbackRefRate: 11.4 },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", flag: "NZ", fallbackRefRate: 51 },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", flag: "CN", fallbackRefRate: 12.4 },
  { code: "QAR", name: "Qatari Riyal", symbol: "﷼", flag: "QA", fallbackRefRate: 24.3 },
  { code: "OMR", name: "Omani Rial", symbol: "﷼", flag: "OM", fallbackRefRate: 230 },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "د.ك", flag: "KW", fallbackRefRate: 289 },
  { code: "BHD", name: "Bahraini Dinar", symbol: ".د.ب", flag: "BH", fallbackRefRate: 235 },
  { code: "ZAR", name: "South African Rand", symbol: "R", flag: "ZA", fallbackRefRate: 5.1 },
  { code: "KRW", name: "South Korean Won", symbol: "₩", flag: "KR", fallbackRefRate: 0.062 },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", flag: "ID", fallbackRefRate: 0.0054 },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫", flag: "VN", fallbackRefRate: 0.0034 },
  { code: "LKR", name: "Sri Lankan Rupee", symbol: "Rs", flag: "LK", fallbackRefRate: 0.29 },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", flag: "TR", fallbackRefRate: 2.1 },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", flag: "SE", fallbackRefRate: 9.4 },
  { code: "DKK", name: "Danish Krone", symbol: "kr", flag: "DK", fallbackRefRate: 13.7 },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", flag: "NO", fallbackRefRate: 8.8 },
  { code: "RUB", name: "Russian Ruble", symbol: "₽", flag: "RU", fallbackRefRate: 1.1 },
  { code: "EGP", name: "Egyptian Pound", symbol: "E£", flag: "EG", fallbackRefRate: 1.8 },
];

export const SUPPORTED_CURRENCY_CODES = CURRENCY_META.map((c) => c.code);
export const currencyMeta = (code: string) => CURRENCY_META.find((c) => c.code === code);
