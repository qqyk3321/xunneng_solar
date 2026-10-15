import type { ServiceCountry } from "@/lib/consultation-intake";
import { AnimatedStatValue } from "./animated-stat-value";
import { AssessmentLink } from "./assessment-link";
import styles from "./why-choose-us.module.css";

const statistics = [
  // Marketing copy retained from the approved design; not a live project count.
  { id: "installations", value: 100, suffix: "+", prefix: "", spokenPrefix: "", label: "Systems installed" },
  { id: "savings", value: 95, suffix: "%", prefix: "~", spokenPrefix: "Approximately ", label: "Bill savings potential" },
  { id: "payback", value: 5, suffix: "", prefix: "<", spokenPrefix: "Less than ", label: "Payback period" },
  { id: "response", value: 24, suffix: "h", prefix: "≤", spokenPrefix: "Within ", label: "Response time" },
];

export function WhyChooseUs({ country }: { country: ServiceCountry | null }) {
  const certificate = country === "AG" ? "UL" : country === "DM" ? "CE" : "UL/CE";
  const location = country === "AG" ? "Antigua" : country === "DM" ? "Dominica" : "the Caribbean";
  const reasons = [
    {
      title: "Lower bills. Smarter backup.",
      mobileTitle: "Lower bills. Smarter backup.",
      text: "Backup for essential loads, with compatible solar, battery, grid and generator integration.",
    },
    {
      title: `Certified equipment for ${location}.`,
      mobileTitle: "Certified equipment.",
      text: `${certificate}-certified equipment with LiFePO4 storage, remote monitoring and support.`,
    },
    country === "DM"
      ? {
          title: "Support for your Dominica home.",
          mobileTitle: "Support in Dominica.",
          text: "Supply and installation coordination, with maintenance arranged for your location.",
        }
      : {
          title: "Local stock and support in Antigua.",
          mobileTitle: "Local stock & support.",
          text: "An Antigua-based team for installation, panel cleaning and reinforcement.",
        },
  ];

  return (
    <section id="benefits" className={styles.section} aria-labelledby="benefits-heading" tabIndex={-1}>
      <div className={styles.layout}>
        <div className={styles.copy}>
          <h2 id="benefits-heading">
            <span className={styles.location}>
              {country === "AG" ? "Your Antigua home." : country === "DM" ? "Your Dominica home." : "Your home. Our Caribbean."}
              <br />
            </span>
            <span className={styles.promise}>Solar you can count on</span>
          </h2>
        </div>
        <ul className={styles.reasons} aria-label="Why choose Sol & Tide">
          {reasons.map(({ title, text }) => (
            <li key={title}><h3>{title}</h3><p>{text}</p></li>
          ))}
        </ul>
        <div className={styles.results}>
          <dl className={styles.stats} aria-label="System benefits at a glance">
            {statistics.map((stat) => (
              <div key={stat.id} className={styles.stat} data-stat={stat.id}>
                <dt>{stat.label}</dt>
                <dd className={styles.value}>
                  <span className={styles.number}>
                    {stat.prefix && <><span className={styles.srOnly}>{stat.spokenPrefix}</span><span aria-hidden="true">{stat.prefix}</span></>}
                    <AnimatedStatValue value={stat.value} suffix={stat.suffix} />
                    {stat.id === "payback" && <> <span className={styles.unit}>years</span></>}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className={styles.mobileReasons}>
          {reasons.map(({ mobileTitle, text }, index) => (
            <details key={mobileTitle} name="solar-benefits" className={styles.reasonDetails} open={index === 0}>
              <summary><h3>{mobileTitle}</h3><span className={styles.toggle} aria-hidden="true" /></summary>
              <p>{text}</p>
            </details>
          ))}
        </div>
        <div className={styles.mobileActions}>
          <AssessmentLink country={country} className={styles.cta} />
        </div>
      </div>
    </section>
  );
}
