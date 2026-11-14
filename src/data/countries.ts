/**
 * Destination countries -> local currency (ISO-3166 alpha-2 -> ISO-4217).
 * Eurozone countries map to EUR. NP and BT are intentionally absent (ELIG-2);
 * see EXCLUDED_COUNTRY_INFO for the info note shown when searched.
 */
export type Country = { iso2: string; name: string; currency: string };

const RAW = `AF|Afghanistan|AFN;AL|Albania|ALL;DZ|Algeria|DZD;AD|Andorra|EUR;AO|Angola|AOA;AG|Antigua and Barbuda|XCD;AR|Argentina|ARS;AM|Armenia|AMD;AU|Australia|AUD;AT|Austria|EUR;AZ|Azerbaijan|AZN;BS|Bahamas|BSD;BH|Bahrain|BHD;BD|Bangladesh|BDT;BB|Barbados|BBD;BY|Belarus|BYN;BE|Belgium|EUR;BZ|Belize|BZD;BJ|Benin|XOF;BO|Bolivia|BOB;BA|Bosnia and Herzegovina|BAM;BW|Botswana|BWP;BR|Brazil|BRL;BN|Brunei|BND;BG|Bulgaria|EUR;BF|Burkina Faso|XOF;BI|Burundi|BIF;KH|Cambodia|KHR;CM|Cameroon|XAF;CA|Canada|CAD;CV|Cape Verde|CVE;CF|Central African Republic|XAF;TD|Chad|XAF;CL|Chile|CLP;CN|China|CNY;CO|Colombia|COP;KM|Comoros|KMF;CG|Congo|XAF;CD|Congo (DRC)|CDF;CR|Costa Rica|CRC;CI|Côte d'Ivoire|XOF;HR|Croatia|EUR;CU|Cuba|CUP;CY|Cyprus|EUR;CZ|Czechia|CZK;DK|Denmark|DKK;DJ|Djibouti|DJF;DM|Dominica|XCD;DO|Dominican Republic|DOP;EC|Ecuador|USD;EG|Egypt|EGP;SV|El Salvador|USD;GQ|Equatorial Guinea|XAF;ER|Eritrea|ERN;EE|Estonia|EUR;SZ|Eswatini|SZL;ET|Ethiopia|ETB;FJ|Fiji|FJD;FI|Finland|EUR;FR|France|EUR;GA|Gabon|XAF;GM|Gambia|GMD;GE|Georgia|GEL;DE|Germany|EUR;GH|Ghana|GHS;GR|Greece|EUR;GD|Grenada|XCD;GT|Guatemala|GTQ;GN|Guinea|GNF;GW|Guinea-Bissau|XOF;GY|Guyana|GYD;HT|Haiti|HTG;HN|Honduras|HNL;HK|Hong Kong|HKD;HU|Hungary|HUF;IS|Iceland|ISK;ID|Indonesia|IDR;IR|Iran|IRR;IQ|Iraq|IQD;IE|Ireland|EUR;IL|Israel|ILS;IT|Italy|EUR;JM|Jamaica|JMD;JP|Japan|JPY;JO|Jordan|JOD;KZ|Kazakhstan|KZT;KE|Kenya|KES;KI|Kiribati|AUD;KW|Kuwait|KWD;KG|Kyrgyzstan|KGS;LA|Laos|LAK;LV|Latvia|EUR;LB|Lebanon|LBP;LS|Lesotho|LSL;LR|Liberia|LRD;LY|Libya|LYD;LI|Liechtenstein|CHF;LT|Lithuania|EUR;LU|Luxembourg|EUR;MO|Macao|MOP;MG|Madagascar|MGA;MW|Malawi|MWK;MY|Malaysia|MYR;MV|Maldives|MVR;ML|Mali|XOF;MT|Malta|EUR;MH|Marshall Islands|USD;MR|Mauritania|MRU;MU|Mauritius|MUR;MX|Mexico|MXN;FM|Micronesia|USD;MD|Moldova|MDL;MC|Monaco|EUR;MN|Mongolia|MNT;ME|Montenegro|EUR;MA|Morocco|MAD;MZ|Mozambique|MZN;MM|Myanmar|MMK;NA|Namibia|NAD;NR|Nauru|AUD;NL|Netherlands|EUR;NZ|New Zealand|NZD;NI|Nicaragua|NIO;NE|Niger|XOF;NG|Nigeria|NGN;KP|North Korea|KPW;MK|North Macedonia|MKD;NO|Norway|NOK;OM|Oman|OMR;PK|Pakistan|PKR;PW|Palau|USD;PA|Panama|PAB;PG|Papua New Guinea|PGK;PY|Paraguay|PYG;PE|Peru|PEN;PH|Philippines|PHP;PL|Poland|PLN;PT|Portugal|EUR;PR|Puerto Rico|USD;QA|Qatar|QAR;RO|Romania|RON;RU|Russian Federation|RUB;RW|Rwanda|RWF;KN|Saint Kitts and Nevis|XCD;LC|Saint Lucia|XCD;VC|Saint Vincent and the Grenadines|XCD;WS|Samoa|WST;SM|San Marino|EUR;ST|São Tomé and Príncipe|STN;SA|Saudi Arabia|SAR;SN|Senegal|XOF;RS|Serbia|RSD;SC|Seychelles|SCR;SL|Sierra Leone|SLE;SG|Singapore|SGD;SK|Slovakia|EUR;SI|Slovenia|EUR;SB|Solomon Islands|SBD;SO|Somalia|SOS;ZA|South Africa|ZAR;KR|South Korea|KRW;SS|South Sudan|SSP;ES|Spain|EUR;LK|Sri Lanka|LKR;SD|Sudan|SDG;SR|Suriname|SRD;SE|Sweden|SEK;CH|Switzerland|CHF;SY|Syria|SYP;TW|Taiwan|TWD;TJ|Tajikistan|TJS;TZ|Tanzania|TZS;TH|Thailand|THB;TL|Timor-Leste|USD;TG|Togo|XOF;TO|Tonga|TOP;TT|Trinidad and Tobago|TTD;TN|Tunisia|TND;TR|Türkiye|TRY;TM|Turkmenistan|TMT;TV|Tuvalu|AUD;UG|Uganda|UGX;UA|Ukraine|UAH;AE|United Arab Emirates|AED;GB|United Kingdom|GBP;US|United States|USD;UY|Uruguay|UYU;UZ|Uzbekistan|UZS;VU|Vanuatu|VUV;VA|Vatican City|EUR;VE|Venezuela|VES;VN|Vietnam|VND;YE|Yemen|YER;ZM|Zambia|ZMW;ZW|Zimbabwe|USD`;

export const COUNTRIES: Country[] = RAW.split(";").map((row) => {
  const [iso2, name, currency] = row.split("|");
  return { iso2, name, currency };
});

const BY_ISO = new Map(COUNTRIES.map((c) => [c.iso2, c]));

export const getCountry = (iso2: string | null | undefined) => (iso2 ? BY_ISO.get(iso2.toUpperCase()) : undefined);
export const countryName = (iso2: string | null | undefined) => getCountry(iso2)?.name ?? iso2 ?? "";
export const countriesForCurrency = (code: string) => COUNTRIES.filter((c) => c.currency === code);
export const isDestinationAllowed = (iso2: string) => BY_ISO.has(iso2.toUpperCase());

/** ELIG-2 info note shown when NP/BT is searched. */
export const EXCLUDED_COUNTRY_INFO: Record<string, string> = {
  NP: "Nepal: foreign exchange is not released for travel to Nepal. Indian Rupees are accepted there.",
  BT: "Bhutan: foreign exchange is not released for travel to Bhutan. Indian Rupees are accepted there.",
};
export const EXCLUDED_SEARCH_TERMS: Record<string, string> = { nepal: "NP", bhutan: "BT", np: "NP", bt: "BT" };

/** flag asset path (downloaded to /public/flags by assets:fetch) */
export const flagPath = (iso2: string) => `/flags/${iso2.toLowerCase()}.svg`;
