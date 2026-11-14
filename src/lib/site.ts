/** Public business details. Contact numbers / licence come from env placeholders - never invented. */
export const SITE = {
  name: "APM Forex",
  legalName: "APM Tours & Travels",
  tagline: "RBI-authorised money changer in Dum Dum, Kolkata",
  address: "79, Motilal Colony, Rajbari, Dum Dum, Kolkata, West Bengal 700028",
  mapsUrl: "https://maps.app.goo.gl/zcQq284p51dauH1y9",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "91XXXXXXXXXX",
  phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "placeholder",
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "placeholder",
  hours: process.env.NEXT_PUBLIC_STORE_HOURS ?? "Mon-Sat 10:00-19:00 (placeholder)",
  grievanceOfficer: process.env.NEXT_PUBLIC_GRIEVANCE_OFFICER ?? "Grievance Officer (placeholder)",
  licenceType: process.env.NEXT_PUBLIC_RBI_LICENCE_TYPE ?? "FFMC",
  licenceNo: process.env.NEXT_PUBLIC_RBI_LICENCE_NO ?? "placeholder",
  ratesDisclaimer: "Rates are indicative and are locked only on payment / at the counter.",
};

export const whatsappUrl = (text = "Hi APM Forex, I would like to know today's forex rates.") =>
  `https://wa.me/${SITE.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

/** tel: link only when the env value looks like a real number */
export const telHref = (phone: string = SITE.phone) => {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits.replace(/\D/g, "").length >= 8 ? `tel:${digits}` : undefined;
};
export const mailHref = (email: string = SITE.email) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? `mailto:${email}` : undefined);
