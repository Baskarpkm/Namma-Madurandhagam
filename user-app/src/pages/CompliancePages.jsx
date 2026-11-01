import {
  BriefcaseBusiness, CalendarDays, Car, Image as ImageIcon, Mail, MapPin, Megaphone,
  Newspaper, Phone, ShieldCheck, Store, UserRoundCog, Zap
} from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';

const EFFECTIVE_DATE = '31 October 2026';

function PageShell({title,subtitle,children}){
  useEffect(()=>{document.title=`${title} | Namma Madurandhagam`;},[title]);
  return <main className="min-h-[70vh] bg-[#f6f9ff] px-4 py-8">
    <section className="mx-auto max-w-4xl overflow-hidden rounded-[30px] border border-blue-100 bg-white shadow-sm">
      <header className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <Link to="/" aria-label="Namma Madurandhagam home"><BrandLogo className="h-16 w-16 rounded-2xl"/></Link>
          <div><p className="text-xs font-black uppercase tracking-[.16em] text-blue-600">Namma Madurandhagam</p><h1 className="mt-1 text-3xl font-black text-slate-950">{title}</h1></div>
        </div>
        {subtitle&&<p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</p>}
        <p className="mt-3 text-xs font-bold text-slate-400">Effective date: {EFFECTIVE_DATE}</p>
      </header>
      <div className="space-y-7 p-6 text-sm leading-7 text-slate-700 sm:p-8">{children}</div>
    </section>
  </main>;
}

function Section({title,children}){return <section><h2 className="text-lg font-black text-slate-950">{title}</h2><div className="mt-2 space-y-3">{children}</div></section>}
function Bullets({children}){return <ul className="list-disc space-y-2 pl-5">{children}</ul>}

export function TermsConditionsPage(){
  return <PageShell title="Terms & Conditions" subtitle="These terms govern access to and use of the Namma Madurandhagam website, community features and paid digital publishing/listing services.">
    <Section title="1. About the service"><p>Namma Madurandhagam is a local community information and digital publishing platform for Madurandhagam and nearby areas. Users can view community information and submit stories, posts, business listings, jobs, events, offers, vehicles, worker/service listings and promotional banners, subject to the applicable plan and admin review.</p></Section>
    <Section title="2. Account and information"><p>You are responsible for providing accurate registration and contact information and for keeping access to your mobile number and account secure. Usernames must be unique. We may restrict accounts that impersonate others, misuse the platform, submit unlawful content or repeatedly violate these terms.</p></Section>
    <Section title="3. User submissions and admin review"><Bullets>
      <li>Paid or free submissions may require admin review before becoming publicly visible.</li>
      <li>We may approve, reject, request changes, unpublish or remove content that is misleading, unlawful, abusive, infringing, unsafe, duplicate, spam or not suitable for the platform.</li>
      <li>You must have the right to upload the text, photos, videos, logos and other media you submit.</li>
      <li>You remain responsible for claims, prices, contact details and information included in your submission.</li>
    </Bullets></Section>
    <Section title="4. Pricing and payments"><p>Prices are displayed in Indian Rupees (INR) on the <Link className="font-bold text-blue-600 underline" to="/pricing-services">Pricing & Products</Link> page and may also be shown before checkout. Payment may be processed by an authorised payment gateway. A successful payment does not guarantee approval of content that violates platform rules.</p></Section>
    <Section title="5. Cancellations and refunds"><p>Cancellation and refund eligibility is governed by our <Link className="font-bold text-blue-600 underline" to="/refund-cancellation">Refund & Cancellation Policy</Link>. Where a refund is approved, we initiate it to the original payment method and normally process it within 5–7 working days.</p></Section>
    <Section title="6. Listing duration and removal"><p>Time-limited plans run according to the plan shown at purchase and, where applicable, begin after admin approval. Permanent/no-expiry listings remain available until the user deletes them, the account is restricted, or the content is removed for a policy or legal reason. Stories are temporary content and may expire automatically.</p></Section>
    <Section title="7. Platform availability"><p>We work to keep the service available, but uninterrupted access is not guaranteed. Maintenance, hosting issues, internet failures or third-party service interruptions may temporarily affect the website, uploads, payments or notifications.</p></Section>
    <Section title="8. Third-party services"><p>The platform may use third-party providers for payment processing, cloud hosting, media storage and similar infrastructure. Their services may be subject to their own terms and privacy practices.</p></Section>
    <Section title="9. Changes"><p>We may update these terms when the service, pricing, legal requirements or platform features change. The latest version will be published on this website with an updated effective date.</p></Section>
    <Section title="10. Contact"><p>Questions about these terms can be sent to <a className="font-bold text-blue-600 underline" href="mailto:sbaskar1892@gmail.com">sbaskar1892@gmail.com</a> or by phone at <a className="font-bold text-blue-600 underline" href="tel:+919025186952">+91 90251 86952</a>.</p></Section>
  </PageShell>;
}

export function PrivacyPolicyPage(){
  return <PageShell title="Privacy Policy" subtitle="This policy explains the information Namma Madurandhagam collects and how it is used to operate the community platform and paid publishing services.">
    <Section title="1. Information we collect"><Bullets>
      <li>Account information such as name, unique username, mobile number, area/village, gender, optional address and optional profile photo.</li>
      <li>Content you submit, including captions, descriptions, photos, videos, comments, chats, listings and contact details entered in a listing.</li>
      <li>Transaction information such as plan, amount, payment status and payment reference. We do not need to store your full card credentials.</li>
      <li>Technical and activity information required for login sessions, security, app functionality, notifications, analytics and fraud/abuse prevention.</li>
    </Bullets></Section>
    <Section title="2. How we use information"><Bullets>
      <li>To create and maintain your account and provide login/session functionality.</li>
      <li>To publish, review, moderate and manage content and paid submissions.</li>
      <li>To process payments, payment status, refunds and customer support.</li>
      <li>To operate social features such as profiles, follows, comments, chat, notifications and content reports.</li>
      <li>To secure the platform, prevent misuse and enforce account restrictions where necessary.</li>
    </Bullets></Section>
    <Section title="3. Public information"><p>Information intentionally published in public posts or listings may be visible to other users. Public user profiles do not intentionally display the registered mobile number. Listing contact information is shown only where the user intentionally provides contact details for that listing.</p></Section>
    <Section title="4. Service providers"><p>We may share only the information reasonably required with service providers that help us run the platform, such as payment processors, hosting providers and media storage providers. Payment gateway providers process payment information under their own security and privacy practices.</p></Section>
    <Section title="5. Retention"><p>We retain account, content, transaction and support records for as long as reasonably required to provide the service, comply with legal/accounting obligations, resolve disputes and prevent abuse. Some expired or deleted media may be removed after the applicable retention or grace period.</p></Section>
    <Section title="6. Security"><p>We use reasonable technical and organisational measures to protect account and platform data. No internet service can guarantee absolute security, so users should also protect their device, mobile number and session access.</p></Section>
    <Section title="7. Your choices"><p>You can update supported profile fields, control available privacy settings and remove your own content where the feature permits. For privacy questions or account/data requests, contact us using the details below.</p></Section>
    <Section title="8. Contact"><p>Email: <a className="font-bold text-blue-600 underline" href="mailto:sbaskar1892@gmail.com">sbaskar1892@gmail.com</a><br/>Phone: <a className="font-bold text-blue-600 underline" href="tel:+919025186952">+91 90251 86952</a></p></Section>
  </PageShell>;
}

export function RefundCancellationPage(){
  return <PageShell title="Refund & Cancellation Policy" subtitle="This policy applies to payments made for digital publishing, listings, promotional content and related services on Namma Madurandhagam.">
    <Section title="1. Cancellation before publication"><p>If a paid submission has not yet been approved/published, you may request cancellation by contacting us with the registered mobile number, submission details and payment reference. We will review the request based on the status of the submission.</p></Section>
    <Section title="2. When a refund may be approved"><Bullets>
      <li>The payment was charged successfully but the paid submission could not be created because of a verified technical failure.</li>
      <li>The same transaction was charged more than once for the same intended purchase.</li>
      <li>We reject a paid submission and the applicable service was not delivered, unless the payment was for a non-refundable service already consumed or the submission involved prohibited/fraudulent activity.</li>
      <li>We otherwise confirm in writing that the customer is eligible for a refund.</li>
    </Bullets></Section>
    <Section title="3. After publication"><p>Once a paid listing, post, banner, offer, job, event or other digital service has been approved and published, the service is considered delivered and the fee is generally non-refundable. You may still request removal of your own content; removal does not normally create a refund entitlement.</p></Section>
    <Section title="4. Refund processing time"><p><strong>Approved refunds are initiated to the original payment method and are normally processed by us within 5–7 working days.</strong> Your bank, card issuer or payment provider may take additional time to reflect the credit after the refund is initiated.</p></Section>
    <Section title="5. How to request a cancellation/refund"><p>Email <a className="font-bold text-blue-600 underline" href="mailto:sbaskar1892@gmail.com">sbaskar1892@gmail.com</a> or call <a className="font-bold text-blue-600 underline" href="tel:+919025186952">+91 90251 86952</a>. Include the registered mobile number, submission title/type, amount, payment reference and reason for the request.</p></Section>
  </PageShell>;
}

const pricing = [
  {Icon:Zap,title:'Story / Normal Post',image:'/app-logo.png',prices:['First 10 approved publishes: Free','Single publish: ₹29','1 Day pack — up to 10 publishes: ₹99','1 Week pack — up to 20 publishes: ₹299','1 Month pack — unlimited publishes: ₹699']},
  {Icon:ImageIcon,title:'Banner Advertising',image:'/app-logo.png',prices:['1 Week: ₹1,000','1 Month: ₹3,000','1 Year: ₹10,000']},
  {Icon:Store,title:'Business / Shop Listing',image:'/app-logo.png',prices:['Single publish — no scheduled expiry: ₹999']},
  {Icon:CalendarDays,title:'Event Post',image:'/app-logo.png',prices:['Single event post: ₹499']},
  {Icon:Megaphone,title:'Offer Post',image:'/app-logo.png',prices:['30 Days: ₹500']},
  {Icon:BriefcaseBusiness,title:'Job Post',image:'/app-logo.png',prices:['1 Week: ₹300','1 Month: ₹1,000']},
  {Icon:Car,title:'Vehicle Listing',image:'/app-logo.png',prices:['1 Week: ₹199','1 Month: ₹399']},
  {Icon:UserRoundCog,title:'Worker / Service Listing',image:'/app-logo.png',prices:['Single publish — no scheduled expiry: ₹399']},
];

export function PricingServicesPage(){
  return <PageShell title="Pricing & Products" subtitle="Current Namma Madurandhagam digital publishing and listing prices. All prices below are in Indian Rupees (INR). The final applicable plan and amount are shown before payment.">
    <div className="grid gap-4 sm:grid-cols-2">
      {pricing.map(({Icon,title,image,prices})=><article key={title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 bg-slate-50 p-4">
          <img src={image} alt={`${title} service`} className="h-14 w-14 rounded-xl border bg-white object-cover"/>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white"><Icon size={20}/></span>
          <h2 className="font-black text-slate-950">{title}</h2>
        </div>
        <ul className="space-y-2 p-4">{prices.map(x=><li key={x} className="rounded-xl bg-blue-50 px-3 py-2 font-bold text-blue-900">{x}</li>)}</ul>
      </article>)}
    </div>
    <Section title="How paid publishing works"><p>Select the relevant category and plan, complete payment, and submit the content for admin review. Approved content goes live based on the rules and duration of the selected plan. Time-limited plans generally start from admin approval where the product flow specifies this.</p></Section>
    <Section title="Important"><p>Prices may be updated in the future. Any updated price will be displayed on this page and in the purchase flow before payment. Taxes, if legally applicable, will be shown as required.</p></Section>
  </PageShell>;
}

export function ShippingDeliveryPage(){
  return <PageShell title="Shipping & Delivery Policy" subtitle="Namma Madurandhagam provides digital publishing and listing services. We do not sell or ship physical goods through the platform.">
    <Section title="Physical shipping"><p><strong>Shipping of physical goods is not applicable.</strong> There is no courier shipment, physical parcel delivery or shipping charge for the services purchased directly from Namma Madurandhagam.</p></Section>
    <Section title="Digital service delivery"><p>After payment, the submission is created in the user's account and may be placed under admin review. The digital service is delivered when the eligible submission is approved/published or when the purchased digital publishing entitlement becomes available according to the selected plan.</p></Section>
    <Section title="Tracking your submission"><p>Users can review paid, pending, approved, rejected or change-required submissions from the My Submissions section of the platform.</p></Section>
    <Section title="Delivery issues"><p>If a successful payment is not reflected or the digital submission cannot be created, contact us at <a className="font-bold text-blue-600 underline" href="mailto:sbaskar1892@gmail.com">sbaskar1892@gmail.com</a> or <a className="font-bold text-blue-600 underline" href="tel:+919025186952">+91 90251 86952</a> with the payment reference.</p></Section>
  </PageShell>;
}

export function ContactUsPage(){
  return <PageShell title="Contact Us" subtitle="Contact Namma Madurandhagam for payment, refund, listing, account or general support.">
    <div className="grid gap-4 sm:grid-cols-3">
      <a href="tel:+919025186952" className="rounded-2xl border bg-slate-50 p-5 hover:border-blue-300"><Phone className="text-blue-600"/><p className="mt-3 text-xs font-black uppercase tracking-wider text-slate-400">Phone</p><p className="mt-1 font-black text-slate-900">+91 90251 86952</p></a>
      <a href="mailto:sbaskar1892@gmail.com" className="rounded-2xl border bg-slate-50 p-5 hover:border-blue-300"><Mail className="text-blue-600"/><p className="mt-3 text-xs font-black uppercase tracking-wider text-slate-400">Email</p><p className="mt-1 break-all font-black text-slate-900">sbaskar1892@gmail.com</p></a>
      <div className="rounded-2xl border bg-slate-50 p-5"><ShieldCheck className="text-blue-600"/><p className="mt-3 text-xs font-black uppercase tracking-wider text-slate-400">Business</p><p className="mt-1 font-black text-slate-900">Namma Madurandhagam</p></div>
    </div>
    <Section title="Operating address"><div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-5"><MapPin className="mt-1 shrink-0 text-blue-600"/><p className="font-bold text-slate-800">Bramanar Street,<br/>Perumbakkam Post,<br/>Madurandhagam Taluk,<br/>Chengalpattu District,<br/>Tamil Nadu - 603306,<br/>India</p></div></Section>
    <Section title="Support information"><p>For payment or refund support, please include your registered mobile number, payment reference, amount and the related submission/listing title so the request can be identified accurately.</p></Section>
  </PageShell>;
}
