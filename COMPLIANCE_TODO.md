# Compliance TODO - to be signed off by the compliance officer / CA before go-live

Every item below is implemented with the stated default and is configurable in
`src/config/compliance.ts` (or the admin Settings strip where noted).

| Rule | Default implemented | Where to change | Question for compliance officer |
|---|---|---|---|
| A1 Licence scope | `LICENCE_TYPE=FFMC`; all purposes enabled, AD2-scope purposes tagged `requiresLicence: "AD2"` | `src/data/purposes.ts` (`enabled`), `NEXT_PUBLIC_RBI_LICENCE_TYPE` | Confirm which purposes the licence permits (Education/Employment/Medical/Emigration are normally AD Cat-II). |
| ELIG-2 Nepal/Bhutan | NP, BT excluded from destinations | `COMPLIANCE.excludedDestinations` | Confirm exclusion list. |
| ELIG-3 Purchase window | Travel within 60 days of order date | `COMPLIANCE.maxDaysBeforeTravel` | Confirm the 60-day window. |
| CAP-1 USD equivalence | USD equivalent is computed at the day's **reference (mid)** rate: `sum(forex x ref / USD ref)` instead of the spec's literal `gross_inr / USD ref` (which includes our margin and would make an exact USD 3,000 purchase read as ~USD 3,045). | `src/lib/pricing.ts` | Confirm the reference rate basis for the cap. |
| SELL-4 Surrender | Informational note: surrender within 180 days, retain up to USD 2,000 | `COMPLIANCE.sell` | Confirm wording. |
| TAX-2 TCS | Nil up to INR 10,00,000 per PAN per FY; 20% travel/other, 2% education/medical, 0% education loan. Base = gross INR of the order. | Settings (`tcs_threshold_inr`, `tcs_rates`) | Confirm FY 2026-27 rates and the TCS base. |
| AML-1 Flags & retention | 5-year retention, no hard deletes; flags: total > high-value threshold, repeat PAN/passport/mobile within 30 days, within 5% under the USD cap or INR 50,000 cash limit | `COMPLIANCE.aml`, Settings `high_value_threshold_inr` | Confirm escalation thresholds and STR workflow. |
| SELL fulfilment | SELL orders are Store Pickup only (customer brings notes to the counter) | `src/lib/schemas.ts` / KYC page | Confirm whether doorstep buy-back is offered. |
