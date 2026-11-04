import { Reveal } from "@/components/animations/Reveal";
import { ContactForm } from "@/components/sections/ContactForm";
import { CONTACT, SECTION_IDS, SITE } from "@/lib/content";

export function Contact() {
  return (
    <section id={SECTION_IDS.contact} className="bg-tan">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 pb-16 pt-[64px] sm:px-8 lg:grid-cols-[1fr_603px] lg:gap-12 lg:pb-[143px] lg:pl-[119px] lg:pr-[91px]">
        <Reveal>
          <h2 className="fluid-heading font-display font-bold text-ink">{CONTACT.heading}</h2>
          <dl className="mt-[36px] flex flex-col gap-[22px] text-[19px] font-bold text-ink lg:ml-[18px] lg:text-[22.77px]">
            <div className="flex flex-wrap gap-x-2">
              <dt>Email:</dt>
              <dd>
                <a href={`mailto:${SITE.email}`} className="transition-colors hover:text-paper">
                  {SITE.email}
                </a>
              </dd>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <dt>Phone:</dt>
              <dd>
                <a href={`tel:${SITE.phone.replace(/[^\d+]/g, "")}`} className="transition-colors hover:text-paper">
                  {SITE.phone}
                </a>
              </dd>
            </div>
          </dl>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="rounded-[30px] bg-card px-[22px] pb-[16px] pt-[22px]">
            <h3 className="mb-[22px] font-display text-[32px] font-bold text-ink lg:text-[38px]">{CONTACT.formHeading}</h3>
            <ContactForm />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
