import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { CallbackForm } from "@/components/forms/CallbackForm";
import { WhatsAppIcon } from "@/components/icons";
import { SITE, mailHref, telHref, whatsappUrl } from "@/lib/site";

export function Contact() {
  const tel = telHref();
  const mail = mailHref();
  const rows = [
    { icon: Phone, label: "Phone", value: SITE.phone, href: tel },
    { icon: WhatsAppIcon, label: "WhatsApp", value: "Chat with us", href: whatsappUrl(), external: true },
    { icon: Mail, label: "Email", value: SITE.email, href: mail },
    { icon: MapPin, label: "Address", value: SITE.address, href: SITE.mapsUrl, external: true },
    { icon: Clock, label: "Business hours", value: SITE.hours },
  ];
  return (
    <section id="contact" aria-labelledby="contact-title" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-20 sm:px-6 sm:pt-28">
      <div className="grid gap-8 rounded-[20px] border border-line bg-surface p-6 sm:p-10 lg:grid-cols-2 lg:gap-14">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Get in touch</p>
          <h2 id="contact-title" className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Contact us
          </h2>
          <p className="mt-3 max-w-md text-ink-muted">Questions about rates, documents or limits? Talk to a real person.</p>
          <dl className="mt-8 grid gap-5">
            {rows.map(({ icon: Icon, label, value, href, external }) => (
              <div key={label} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</dt>
                  <dd className="mt-0.5 text-[15px]">
                    {href ? (
                      <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="hover:text-accent hover:underline">
                        {value}
                      </a>
                    ) : (
                      value
                    )}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-2xl bg-bg p-5 sm:p-6">
          <h3 className="font-display text-lg font-semibold">Send an enquiry</h3>
          <p className="mt-1 text-sm text-ink-muted">We&apos;ll call you back during business hours.</p>
          <CallbackForm source="CONTACT_FORM" showPreferredTime={false} noteLabel="Your question" submitLabel="Send enquiry" className="mt-5" />
        </div>
      </div>
    </section>
  );
}
