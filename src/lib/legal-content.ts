/**
 * The three legal pages, as published on the original Mindvines site.
 * Written in a tiny markup so the wording is easy to edit:
 *   ## Heading      a numbered section heading
 *   ### Heading     a sub-heading
 *   - item          list items (consecutive lines)
 *   anything else   a paragraph (blocks are separated by a blank line)
 */

export type LegalDocument = {
  slug: "terms" | "refund-policy" | "privacy-policy";
  title: string;
  description: string;
  body: string;
};

const TERMS = `
Welcome to Mindvines.

These Terms & Conditions (“Terms”) govern your use of the Mindvines website and your participation in the Mindvines Shared Journal Programme.

By registering for a Mindvines subscription or using our website, you agree to these Terms. If you are registering a child for the programme, you confirm that you are the child's parent or legal guardian and are authorised to agree to these Terms on the child's behalf.

## 1. About Mindvines

Mindvines is a shared journal programme in which physical journals travel from child to child. Each journal is centred around a particular topic for writing or sketching. Children read contributions made by other participating children, add their own contribution, and pass the journal on.

Mindvines manages the preparation, delivery, collection, review and circulation of the journals.

The programme is designed for children within the age groups specified on the Mindvines website at the time of registration.

## 2. Registration

A parent or legal guardian must register a child for the Mindvines programme.

The parent or guardian is responsible for:

- providing accurate and complete information;
- ensuring that the child is eligible for the selected programme;
- providing the required parental consent for processing the child's personal information;
- ensuring that the delivery information provided to Mindvines is accurate; and
- informing Mindvines of any relevant changes to the information provided.

A child should not independently create a paid Mindvines subscription.

## 3. Subscriptions

Mindvines currently offers monthly, quarterly and annual subscription plans.

Depending on the plan selected, parents may subscribe to:

- Writing journals (for 9-12 year olds);
- Sketching journals (for all age groups); or
- Both Writing and Sketching journals (for 9-12 year olds).

The applicable price, duration and inclusions will be displayed at the time of purchase.

Each programme cycle lasts 15 days.

The specific topics available to a child may vary depending on the child's selected preferences, age group and the topics offered by Mindvines during the relevant period.

## 4. Topic Selection

At registration, children select their preferred topics from the available list. Mindvines will use these preferences when allocating topics during the subscription period.

Selecting a topic does not guarantee that the topic will be sent during a particular cycle.

Mindvines may introduce new topics, repeat topics, or carry forward previously selected topics as part of the programme.

## 5. Journal Circulation

A journal may contain contributions from children who have participated before your child receives it. Occasionally, a child may be among the first to contribute to a particular topic.

Children are expected to treat the journals and other children's contributions with care and respect. The journals remain part of the Mindvines programme and are intended to continue travelling between participating children.

## 6. Children's Contributions

Children's contributions will be reviewed by the Mindvines team before being shared with another participant. This review is intended to help maintain a safe, respectful and age-appropriate environment for all participating children

Where a contribution contains a part that is not suitable for sharing within the programme, Mindvines may remove or edit that part before the contribution is circulated, while preserving the rest of the child's contribution. If the contribution cannot be made suitable through such edits, Mindvines may choose not to circulate it.

From time to time, Mindvines may select certain writing or artwork to feature on the Mindvines website or other Mindvines-owned channels, subject to the applicable parental consent.

## 7. Delivery and Collection

Mindvines will arrange delivery and collection of journals in accordance with the programme schedule. Parents will generally be informed through WhatsApp or another designated communication channel about the expected delivery or collection date and time slot.

If a child or parent is unavailable at the scheduled time, Mindvines will make another reasonable delivery or collection attempt. A missed delivery or collection does not extend the subscription period or the applicable 15-day cycle.

Delivery schedules may occasionally change because of circumstances outside Mindvines' reasonable control.

## 8. Care of Journals

Parents and children are expected to take reasonable care of the journals while they are in their possession. At present, Mindvines does not charge parents for journals that are accidentally lost or damaged while in a child's possession. Mindvines reserves the right to introduce a replacement charge in the future. Any such change will be communicated to parents in advance.

If a journal is received in a condition that prevents participation, Mindvines will arrange a replacement at no additional cost.

## 9. Payments

All subscription prices are displayed on the Mindvines website at the time of purchase. Payments are processed through the payment service provider made available by Mindvines. A subscription is considered active once payment has been successfully received and the registration has been accepted by Mindvines.

## 10. Automatic Renewal

Subscriptions may automatically renew at the end of the applicable subscription period. By selecting an automatically renewing subscription, you authorise the applicable payment provider to process the renewal payment according to the subscription selected. You may cancel your subscription before the next renewal to prevent a future charge.

Details regarding the applicable subscription price and renewal frequency will be presented during registration.

## 11. Cancellation and Refunds

Parents may cancel their subscription at any time. Cancellation prevents future renewals and future charges.

Completed or active 15-day cycles are not refundable. Where a subscription has unused cycles remaining, the amount attributable to those unused cycles will be refunded in accordance with our Refund & Cancellation Policy. Please refer to the Refund & Cancellation Policy for details regarding refunds, delivery issues and other circumstances in which a refund may apply.

## 12. No Guarantee of Participation

Mindvines provides children with an opportunity to participate, read contributions and contribute to journals. However, we cannot guarantee that a child will contribute to every journal or topic.

A child's decision not to write or draw on a particular occasion does not constitute a failure to provide the service and does not by itself qualify for a refund.

## 13. Intellectual Property

The Mindvines name, logo, website design, written materials, programme structure, original topics, graphics and other content created by Mindvines are owned by or licensed to Mindvines and may not be copied, reproduced or commercially exploited without permission.

Children retain ownership of the original creative work they contribute, subject to the permissions granted to Mindvines for operating and promoting the programme.

By participating in Mindvines, the parent or legal guardian grants Mindvines the permissions necessary to reproduce and display the child's contribution for the purposes of operating the Shared Journal Programme and, where separately consented to, featuring the contribution on Mindvines' website or other Mindvines-owned channels.

## 14. Programme Changes

Mindvines is an evolving programme. We will provide appropriate notice where a change materially affects an existing subscription or the parent's payment obligations.

## 15. Discontinuation

If Mindvines permanently discontinues the programme and a parent has paid for unused cycles, the unused portion will be refunded in accordance with our Refund & Cancellation Policy.

## 16. Website Use

You agree not to:

- use the website for unlawful purposes;
- attempt to gain unauthorised access to our systems;
- interfere with the operation or security of the website;
- copy or reproduce website content without permission; or
- use the website to collect information about participating children.

Mindvines may restrict access to the website where necessary to protect the security or integrity of the service.

## 17. Third-Party Services

Mindvines may use third-party service providers for payments, delivery, hosting, communications and other operational functions.

Your use of those services may also be subject to the relevant third party's terms and policies. Mindvines is not responsible for interruptions or failures caused by third-party services that are outside our reasonable control.

## 18. Limitation of Liability

Mindvines will take reasonable steps to provide the programme safely and reliably.

However, to the extent permitted by applicable law, Mindvines will not be responsible for indirect or consequential losses arising from circumstances beyond our reasonable control, including delays caused by delivery providers, technical failures, natural events or other external circumstances.

Nothing in these Terms excludes or limits any liability that cannot legally be excluded or limited under applicable law.

## 19. Privacy

Your use of Mindvines is also subject to our Privacy Policy, which explains how we collect, use, store and protect personal information, including information relating to participating children.

The Privacy Policy forms part of these Terms.

## 20. Changes to These Terms

We may update these Terms from time to time.

The updated Terms will be published on this page with a revised “Last updated” date.

Where a change materially affects an existing subscription, we will provide appropriate notice where required.

Your continued use of the service after the updated Terms take effect constitutes acceptance of the revised Terms, to the extent permitted by applicable law.

## 21. Governing Law and Jurisdiction

These Terms shall be governed by the laws of India.

Subject to applicable consumer-protection laws and other mandatory legal requirements, disputes arising in connection with these Terms shall be subject to the jurisdiction of the courts having appropriate jurisdiction over Bengaluru, Karnataka.

## 22. Contact Us

If you have any questions regarding these Terms, please contact:

Mindvines

Email: info@mindvines.in

Phone: 9176001899
`;

const REFUND = `
At Mindvines, we want children to have the freedom to explore the programme at their own pace, while ensuring that our journals can keep moving smoothly from one child to another.

Please read the following policy before subscribing.

## 1. Subscription Plans

Mindvines offers monthly, quarterly and annual subscription plans.

You may subscribe to:

- Writing journals
- Sketching journals
- Both writing and sketching journals

The price varies depending on the plan and the type of journals selected.

Each subscription is delivered in 15-day cycles. A cycle begins when the journals for that cycle are dispatched to your child.

## 2. Cancellation

You may cancel your subscription at any time. Cancellation will stop future renewals and future charges. We do not offer a trial period.

## 3. Refunds for Unused Cycles

If you cancel a subscription before all the cycles included in your current subscription period have been used, the amount attributable to the unused cycles will be refunded.

Completed or active cycles are not refundable, as the service for those cycles has already been provided or initiated.

For example, if you purchase an annual subscription and cancel after two completed 15-day cycles, the amount attributable to the remaining unused cycles will be refunded.

The refund will be calculated based on the applicable subscription price and the number of unused cycles remaining.

## 4. Automatic Renewal

Subscriptions are set to renew automatically at the end of the applicable subscription period. You may cancel your subscription before the next renewal date to prevent the next charge. We will provide the relevant renewal information at the time of subscription.

## 5. Journal Damage or Condition

If a journal reaches you damaged or in a condition that prevents your child from participating, please inform us. We will arrange a replacement at no additional cost.

If a journal is lost or damaged while in your child's possession, we currently do not charge a replacement fee. If this policy changes in the future, parents will be informed in advance.

## 6. Delivery

Mindvines will inform parents through WhatsApp about the expected date and delivery slot for each journal delivery and collection.

If a delivery or collection cannot be completed because the parent or child is unavailable, we will make another attempt. A missed delivery or collection does not extend the subscription period or the 15-day cycle.

## 7. If Mindvines Is Unable to Continue the Programme

If, for any reason, Mindvines is unable to continue providing the programme, we will refund the amount attributable to any unused cycles.

## 8. Processing of Refunds

Approved refunds will be made to the original payment method used for the subscription.

Please allow up to 7 business days for the refund to be processed after it has been approved. The time taken for the amount to appear in your account may also depend on your bank or payment provider.

## 9. Participation

Mindvines is designed to be a voluntary and enjoyable activity for children. A child may choose not to contribute to a particular journal entry.

However, lack of participation or engagement does not qualify for a refund, as the journal service and access to the programme continue to be provided.

## 10. Changes to This Policy

We may update this Refund & Cancellation Policy from time to time. Any significant changes will be communicated to existing subscribers in advance.

If you have any questions about cancellation or refunds, please contact us at info@mindvines.in or Whatsapp at +91-9176001899 .
`;

const PRIVACY = `
Mindvines (“Mindvines”, “we”, “us” or “our”) respects the privacy of children and their parents and is committed to handling personal information responsibly.

This Privacy Policy explains what personal information we collect, how we use it, who we share it with, and the choices available to you when you use the Mindvines website, register for our Shared Journal Programme, or communicate with us.

Because Mindvines is designed for children, we take particular care with children's information.

## 1. Who this Policy applies to

This Privacy Policy applies to:

- visitors to the Mindvines website;
- parents or legal guardians who register a child for the Mindvines programme;
- children participating in the Mindvines programme; and
- individuals who communicate with Mindvines regarding our services.

For children, registration and consent must be provided by a parent or legal guardian.

## 2. Information We Collect

We collect only information that is reasonably necessary to operate Mindvines and provide the programme.

### Information about parents or guardians

When you register, purchase a subscription or communicate with us, we may collect:

- Parent/guardian name
- Mobile number
- Email address
- Delivery address
- Payment and transaction information
- Subscription details
- Communications with Mindvines

Payment information is processed through our payment service provider. Mindvines does not store your complete card or other payment credentials on its own systems.

### Information about participating children

To operate the Shared Journal Programme, we may collect limited information about the child, such as:

- First name, where required for programme administration
- Nickname
- Age or age group
- School name
- City
- Selected writing and/or sketching topics
- The child's written or drawn contributions to the journals

We encourage children to use a nickname rather than their full name in their journal contributions.

We do not require children to provide photographs, phone numbers, email addresses or social-media usernames as part of their participation.

## 3. Children's Contributions

A central part of Mindvines is that children can read contributions made by other participating children and add their own. Before a child's contribution is shared with another participant, it is reviewed by the Mindvines team.

Contributions made in the physical journals may be seen by:

- the Mindvines team for review and moderation;
- other children participating in the relevant journal; and
- their parents or guardians where the physical journal is accessible to them.

From time to time, selected contributions may also be featured on the Mindvines website. These may include written pieces, drawings or sketches and may be published on an ongoing basis.

Where a child's contribution is featured on the website, we will take care not to publish the child's full name, contact details, photograph or other information that could directly identify or contact the child. We may display the nickname, age group, school and city associated with the contribution, as applicable

## 4. Why We Collect and Use Personal Information

We use personal information to:

- register children and parents for the programme;
- process subscriptions and payments;
- organise journals and topic selections;
- deliver and collect physical journals;
- communicate with parents about deliveries, collections and subscriptions;
- review and moderate children's contributions;
- maintain programme records;
- respond to questions and provide customer support;
- prevent misuse and maintain the safety of the programme;
- comply with legal and regulatory requirements; and
- improve the operation of Mindvines.

We will not use children's personal information for targeted advertising or behavioural profiling.

The DPDP Act specifically restricts tracking or behavioural monitoring of children and targeted advertising directed at children.

## 5. Parental Consent

Because Mindvines is a programme for children, we obtain consent from a parent or legal guardian before collecting and processing personal information relating to a child, in accordance with applicable law.

The parent or legal guardian is responsible for providing accurate information and confirming that they are authorised to provide consent on behalf of the child.

Where applicable law requires additional verification of parental consent, Mindvines will implement an appropriate verification mechanism.

The 2025 DPDP Rules specifically provide for measures to establish that the person providing consent for a child's data is the child's parent or legal guardian.

## 6. Information We Share

We do not sell or rent personal information.

We may share information with service providers who help us operate Mindvines, such as:

- payment service providers;
- delivery and logistics providers;
- technology, hosting and website service providers; and
- other service providers necessary to operate the programme.

These service providers receive only the information reasonably necessary for the service they provide.

For example, a delivery partner may receive a parent's name, delivery address and phone number where necessary to deliver or collect a journal.

We may also disclose information where required by law, legal process, or a lawful request from a government or regulatory authority.

## 7. Payment Information

Payments may be processed through third-party payment providers such as Razorpay.

Payment providers may collect and process payment and transaction information in accordance with their own privacy policies and applicable law. Razorpay's current privacy documentation describes its processing of transaction, contact and technical information and its role in processing payments for merchants.

Mindvines does not store complete card details or other payment credentials on its own systems.

## 8. WhatsApp and Other Communications

We may use WhatsApp, email, SMS or telephone to communicate with parents regarding:

- registration;
- subscription and payment matters;
- journal delivery and collection;
- programme-related updates;
- customer support; and
- other information relating directly to the Mindvines service.

We will not ask children to communicate with Mindvines through personal social-media accounts or direct messaging platforms.

## 9. Website, Cookies and Technical Information

When you visit our website, certain technical information may be collected automatically by our website hosting, analytics or other technology providers.

This may include information such as:

- IP address;
- browser and device information;
- pages visited;
- approximate usage information; and
- information collected through cookies or similar technologies.

We use such information primarily to operate, secure and improve our website.

We will not use tracking technologies to build behavioural profiles of participating children or to serve targeted advertising to children. Where required, we will obtain consent for non-essential cookies or similar technologies.

## 10. Data Security

We take reasonable technical, organisational and administrative measures to protect personal information against unauthorised access, disclosure, alteration, loss or misuse.

Access to children's information is limited to people who need it for operating or safeguarding the programme.  However, no method of transmitting or storing information electronically can be guaranteed to be completely secure. If we become aware of a personal-data breach affecting your information, we will take appropriate steps in accordance with applicable law.

## 11. How Long We Keep Information

We retain personal information only for as long as reasonably necessary for the purposes for which it was collected, including providing the programme, maintaining appropriate business records, resolving disputes and complying with legal obligations.

Children's journal contributions are an integral part of the Mindvines programme and may be retained as part of the Mindvines archive. Physical contributions may be digitised and securely stored so that the journals and the perspectives shared through them can be preserved over time. We intend to retain this archive for as long as reasonably practicable, subject to applicable law and any rights exercised by the child or their parent/guardian.

Where personal information is no longer required, we will delete or anonymise it, subject to applicable legal or regulatory requirements.

## 12. Your Rights

Subject to applicable law, parents and other Data Principals may have rights relating to their personal data, including rights to:

- obtain information about the personal data being processed;
- request correction of inaccurate or incomplete information;
- request erasure of personal information where permitted;
- withdraw consent where consent is the basis for processing; and
- raise a grievance regarding the processing of personal information.

The DPDP Act provides for rights relating to access, correction/erasure, withdrawal of consent and grievance redressal.

To exercise these rights, please contact us using the details provided below.

Where a request concerns a child's personal information, we may need to verify the identity and authority of the requesting parent or legal guardian.

## 13. Children's Privacy

Mindvines is designed with children's privacy and safety in mind.

We:

- obtain parental consent as required;
- limit the information collected from children;
- encourage the use of nicknames;
- do not publicly display children's personal contact information;
- review contributions before they are shared with another child;
- do not sell children's personal information;
- do not use children's information for targeted advertising; and
- do not use children's information to create behavioural profiles.

The Mindvines programme is based on children connecting through their contributions, not through exchanging personal contact details.

## 14. Third-Party Websites and Services

Our website may contain links to third-party websites or services.

This Privacy Policy does not apply to the privacy practices of those third parties. We encourage parents to review their privacy policies before providing personal information to them.

## 15. Changes to This Privacy Policy

We may update this Privacy Policy from time to time to reflect changes to our services, technology or applicable laws.

The updated version will be published on this page with a revised “Last updated” date.

Where a change materially affects how we process personal information, we will provide appropriate notice where required by law.

## 16. Contact Us

If you have questions about this Privacy Policy, wish to exercise a privacy right, or have a concern about how personal information is being handled, please contact:

Mindvines

Email: info@mindvines.in

Phone: +91-9176001899

We will make reasonable efforts to respond to privacy-related requests and grievances within the period prescribed by applicable law.
`;

export const LEGAL_DOCUMENTS: Record<LegalDocument["slug"], LegalDocument> = {
  terms: {
    slug: "terms",
    title: "Terms & Conditions",
    description: "The terms that govern your use of the Mindvines website and the Mindvines Shared Journal Programme.",
    body: TERMS,
  },
  "refund-policy": {
    slug: "refund-policy",
    title: "Refund & Cancellation Policy",
    description: "How cancellation, unused cycles and refunds work for a Mindvines subscription.",
    body: REFUND,
  },
  "privacy-policy": {
    slug: "privacy-policy",
    title: "Privacy Policy",
    description: "What personal information Mindvines collects about parents and children, how it is used and your choices.",
    body: PRIVACY,
  },
};

export type LegalBlock =
  | { type: "h2" | "h3" | "p"; text: string }
  | { type: "ul"; items: string[] };

/** Turns the markup above into blocks for rendering. */
export function parseLegalBody(body: string): LegalBlock[] {
  return body
    .trim()
    .split(/\n\s*\n/)
    .map((chunk): LegalBlock => {
      const text = chunk.trim();
      if (text.startsWith("### ")) return { type: "h3", text: text.slice(4) };
      if (text.startsWith("## ")) return { type: "h2", text: text.slice(3) };
      const lines = text.split("\n");
      if (lines.every((line) => line.startsWith("- "))) return { type: "ul", items: lines.map((line) => line.slice(2).trim()) };
      return { type: "p", text: text.replace(/\n/g, " ") };
    });
}
