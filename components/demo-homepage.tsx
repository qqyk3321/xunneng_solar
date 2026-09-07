import packageJson from "@/package.json";

export function DemoHomepage() {
  return (
    <div className="demo-home tailwind-scope">
  <header className="fixed top-0 w-full z-50 bg-surface-bright/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
    <div className="h-20 max-w-[1360px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin-desktop flex items-center justify-between">
      <div className="flex items-center gap-space-sm">
        <img
          alt="Caribbean Solar & Storage Logo"
          className="h-8 w-auto object-contain"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCbS8SD9uPuJ5oxCAL-RJJYy4PJNDQFY3xV9WHKaMH9Q_M2uybLvcarG1oNgRWumbDugyMKzO7kWf77rLewrR_bAsufLojx8HGGi6ikOBYgCykXNdTXHsRsIiEeUm67MZvMdfrwn4QwBjQnGU-QQz3lmm46U8vH7x3plpudCYwjma8xniYAqIYInsmjerw5Z34E612xkIEgtnZqAlFlD-DHulboZyyNjEnAu9edC1uyxvzTnIuMuCca"
        />
        <span className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight">
          Sol &amp; Tide Energy
        </span>
      </div>
      <nav
        className="hidden lg:flex items-center gap-space-xl"
        data-active-classes="text-primary font-bold"
      />
      <div className="flex items-center gap-space-md">
        <a
          className="hidden sm:inline-flex items-center justify-center bg-primary-container text-on-primary font-label-md text-label-md uppercase tracking-wider px-space-lg py-space-sm rounded-lg hover:bg-primary transition-all duration-200 shadow-[0_4px_14px_rgba(0,122,135,0.25)]"
          data-path="free-assessment"
          href="/consultation"
        >
          Get Your Free Assessment
        </a>
      </div>
    </div>
  </header>
  <main className="w-full pt-20 bg-background">
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden bg-surface -mt-20 pt-20 pb-space-3xl lg:pb-space-4xl">
        {/* Full-Bleed Aerial Coastal Backdrop with Subtle Gradient Scrim */}
        <div className="absolute inset-0 z-0">
          <img
            alt="Aerial coastal view of luxury Caribbean villas equipped with rooftop solar arrays and an engineered battery microgrid installation"
            className="w-full h-full object-cover object-center transform scale-105 transition-transform duration-1000 ease-out"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBO8sy9rZQu18XXsryGTTrzlndxDiumh3ZIr6_HGFb0DcAgM_kQLwfm2HCcSlYSEK2KMVb32NCfyojj6Mf5Ox7F6xc956zVNekFfnbf9GAVRbQ-HsdZ_Z4v29wdr73LB1AhcDsXqPbIEdlkCMnKGUze9dfjhpFXHUif06fcLtjSW6Nc1S4ZZwnfwWbFnC7jBzHLxaE5d0tE6vf7Yi2leAmbSMhmvfoT_t6tEeCwoKeuRhUl1noLnA77"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-on-surface/90 via-on-surface/60 to-on-surface/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-on-surface/40" />
        </div>
        {/* Hero Content Container */}
        <div className="relative z-10 max-w-[1360px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin-desktop pt-space-2xl md:pt-space-3xl lg:pt-space-4xl flex flex-col items-start justify-center min-h-[78vh]">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-space-xs px-space-md py-space-2xs rounded-full bg-surface-bright/95 backdrop-blur-md shadow-md mb-space-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary-container opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
            </span>
            <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface">
              Engineered for Island Resiliency
            </span>
          </div>
          {/* Main Headline */}
          <h1 className="font-display-hero text-headline-lg md:text-display-hero text-on-primary max-w-3xl font-bold tracking-tight mb-space-md leading-[1.08]">
            Reliable Solar + Storage for the Caribbean
          </h1>
          {/* Subtitle */}
          <p className="font-body-lg text-body-md md:text-body-lg text-surface-container-highest max-w-2xl mb-space-xl font-normal">
            Turn abundant sunshine into 24/7 clean power. No outages. Lower
            bills. Hurricane-grade systems purpose-built for tropical climates
            and sovereign energy independence.
          </p>
          {/* Primary Action CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-md mb-space-3xl w-full sm:w-auto">
            <a
              className="inline-flex items-center justify-center gap-space-xs bg-primary-container text-on-primary font-headline-sm text-body-md font-bold px-space-xl py-space-md rounded-lg shadow-xl hover:bg-primary transition-all duration-300 transform hover:-translate-y-0.5"
              href="/consultation"
            >
              <span>Get Your Free Assessment</span>
              <span className="material-symbols-outlined text-[20px]">
                arrow_forward
              </span>
            </a>
          </div>
          {/* Metric Pills / Social Proof Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md w-full max-w-4xl">
            <div className="flex items-center gap-space-sm bg-surface-bright/90 backdrop-blur-lg rounded-xl p-space-md shadow-lg">
              <div className="w-10 h-10 rounded-lg bg-primary-fixed/40 flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-[22px]">
                  bolt
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-metric-numeral text-headline-sm text-on-surface font-bold">
                  99.9%
                </span>
                <span className="font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant truncate">
                  Grid Uptime Record
                </span>
              </div>
            </div>
            <div className="flex items-center gap-space-sm bg-surface-bright/90 backdrop-blur-lg rounded-xl p-space-md shadow-lg">
              <div className="w-10 h-10 rounded-lg bg-secondary-fixed/50 flex items-center justify-center text-secondary shrink-0">
                <span className="material-symbols-outlined text-[22px]">
                  battery_charging_full
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-metric-numeral text-headline-sm text-on-surface font-bold">
                  Tier-1 LFP
                </span>
                <span className="font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant truncate">
                  Prismatic Storage Cells
                </span>
              </div>
            </div>
            <div className="flex items-center gap-space-sm bg-surface-bright/90 backdrop-blur-lg rounded-xl p-space-md shadow-lg">
              <div className="w-10 h-10 rounded-lg bg-tertiary-fixed/50 flex items-center justify-center text-tertiary shrink-0">
                <span className="material-symbols-outlined text-[22px]">
                  cyclone
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-metric-numeral text-headline-sm text-on-surface font-bold">
                  Cat-5 Rated
                </span>
                <span className="font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant truncate">
                  180+ MPH Wind Mounts
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Four Value Pillars (四大卖点图标栏) */}
      <section className="w-full py-space-3xl lg:py-space-4xl bg-surface-container-lowest relative z-10">
        <div className="max-w-[1360px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin-desktop">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-2xl gap-space-md">
            <div>
              <span className="font-label-md text-label-md uppercase tracking-wider text-primary font-bold block mb-space-2xs">
                Engineering Excellence
              </span>
              <h2 className="font-headline-lg text-headline-md md:text-headline-lg text-on-surface font-bold tracking-tight">
                Built for Extreme Coastal Durability
              </h2>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
              Standard solar hardware deteriorates rapidly under harsh salt
              mist, extreme humidity, and cyclonic storm winds. Our microgrids
              are purpose-engineered to endure and thrive.
            </p>
          </div>
          {/* 4 Core Pillars Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter-desktop">
            {/* Pillar 1 */}
            <div className="flex flex-col bg-surface-container-low p-space-xl rounded-xl transition-all duration-300 hover:shadow-xl hover:bg-surface-container group">
              <div className="w-14 h-14 rounded-xl bg-secondary-fixed flex items-center justify-center text-secondary mb-space-lg shadow-sm group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[28px]">
                  wb_sunny
                </span>
              </div>
              <span className="font-label-md text-label-md uppercase tracking-wider text-secondary font-bold mb-space-2xs">
                Abundant Sunshine
              </span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold mb-space-xs">
                Maximize Your ROI
              </h3>
              <p className="font-body-md text-body-sm text-on-surface-variant leading-relaxed">
                Harness year-round tropical irradiance with high-efficiency
                bifacial panels that convert direct and reflected ambient ocean
                light into sustained kilowatt yield.
              </p>
            </div>
            {/* Pillar 2 */}
            <div className="flex flex-col bg-surface-container-low p-space-xl rounded-xl transition-all duration-300 hover:shadow-xl hover:bg-surface-container group">
              <div className="w-14 h-14 rounded-xl bg-primary-fixed flex items-center justify-center text-primary mb-space-lg shadow-sm group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[28px]">
                  security
                </span>
              </div>
              <span className="font-label-md text-label-md uppercase tracking-wider text-primary font-bold mb-space-2xs">
                Power Security
              </span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold mb-space-xs">
                Stay Running Through Any Storm
              </h3>
              <p className="font-body-md text-body-sm text-on-surface-variant leading-relaxed">
                Hurricane-grade microgrids with millisecond automated battery
                failover. Island mode isolates your estate instantly, keeping
                critical refrigeration and climate control live.
              </p>
            </div>
            {/* Pillar 3 */}
            <div className="flex flex-col bg-surface-container-low p-space-xl rounded-xl transition-all duration-300 hover:shadow-xl hover:bg-surface-container group">
              <div className="w-14 h-14 rounded-xl bg-surface-container-highest flex items-center justify-center text-tertiary mb-space-lg shadow-sm group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[28px]">
                  payments
                </span>
              </div>
              <span className="font-label-md text-label-md uppercase tracking-wider text-tertiary font-bold mb-space-2xs">
                Cut Energy Costs
              </span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold mb-space-xs">
                Escape Volatile Diesel Prices
              </h3>
              <p className="font-body-md text-body-sm text-on-surface-variant leading-relaxed">
                Drastically reduce dependence on imported island fossil fuels
                and utility surcharges. Lock in stabilized, predictable
                levelized energy costs for decades.
              </p>
            </div>
            {/* Pillar 4 */}
            <div className="flex flex-col bg-surface-container-low p-space-xl rounded-xl transition-all duration-300 hover:shadow-xl hover:bg-surface-container group">
              <div className="w-14 h-14 rounded-xl bg-tertiary-fixed flex items-center justify-center text-primary mb-space-lg shadow-sm group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[28px]">
                  eco
                </span>
              </div>
              <span className="font-label-md text-label-md uppercase tracking-wider text-primary font-bold mb-space-2xs">
                100% Clean
              </span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold mb-space-xs">
                Meet Sustainability Goals
              </h3>
              <p className="font-body-md text-body-sm text-on-surface-variant leading-relaxed">
                Zero-emission resilient power for resorts, private estates, and
                remote communities. Protect pristine coastal ecosystems while
                delivering uninterrupted high-output load capacity.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* Service Areas (服务区域) */}
      <section className="w-full py-space-3xl lg:py-space-4xl bg-surface relative">
        <div className="max-w-[1360px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin-desktop">
          <div className="flex flex-col lg:flex-row gap-space-2xl lg:items-center justify-between mb-space-2xl">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-space-xs px-space-sm py-space-2xs rounded-full bg-primary-fixed/40 text-on-primary-fixed-variant mb-space-sm">
                <span className="material-symbols-outlined text-[16px]">
                  public
                </span>
                <span className="font-label-md text-label-md uppercase tracking-wider">
                  Archipelago Infrastructure
                </span>
              </div>
              <h2 className="font-headline-lg text-headline-md md:text-headline-lg text-on-surface font-bold tracking-tight mb-space-sm">
                Service Areas Across the Caribbean
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Full-spectrum turnkey engineering, EPC procurement, local
                permitting navigation, and certified operations deployed across
                12 sovereign island territories.
              </p>
            </div>
            {/* Capability Highlight Pill Banner */}
            <div className="flex flex-wrap gap-space-sm bg-surface-container-lowest p-space-md rounded-xl shadow-md">
              <div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-body-sm">
                <span className="material-symbols-outlined text-primary text-[18px]">
                  verified
                </span>
                <span>Local Deployment Teams</span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-outline-variant/30 my-auto" />
              <div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-body-sm">
                <span className="material-symbols-outlined text-primary text-[18px]">
                  engineering
                </span>
                <span>Hurricane Stamped Blueprints</span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-outline-variant/30 my-auto" />
              <div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-body-sm">
                <span className="material-symbols-outlined text-primary text-[18px]">
                  receipt_long
                </span>
                <span>Duty-Free Tariff Support</span>
              </div>
            </div>
          </div>
          {/* Island Badges Interactive Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-space-md">
            {/* 1. The Bahamas */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm hover:shadow-md hover:bg-surface-container-highest/50 transition-all cursor-default flex flex-col justify-between min-h-[110px] group">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="material-symbols-outlined text-tertiary group-hover:text-primary transition-colors text-[24px]">
                  location_on
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                  NAS / FPO
                </span>
              </div>
              <div>
                <h4 className="font-headline-sm text-body-md font-bold text-on-surface group-hover:text-primary transition-colors">
                  The Bahamas
                </h4>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Full Microgrid EPC
                </span>
              </div>
            </div>
            {/* 2. Jamaica */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm hover:shadow-md hover:bg-surface-container-highest/50 transition-all cursor-default flex flex-col justify-between min-h-[110px] group">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="material-symbols-outlined text-tertiary group-hover:text-primary transition-colors text-[24px]">
                  location_on
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                  KIN / MBJ
                </span>
              </div>
              <div>
                <h4 className="font-headline-sm text-body-md font-bold text-on-surface group-hover:text-primary transition-colors">
                  Jamaica
                </h4>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Commercial &amp; Estate
                </span>
              </div>
            </div>
            {/* 3. Barbados */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm hover:shadow-md hover:bg-surface-container-highest/50 transition-all cursor-default flex flex-col justify-between min-h-[110px] group">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="material-symbols-outlined text-tertiary group-hover:text-primary transition-colors text-[24px]">
                  location_on
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                  BGI
                </span>
              </div>
              <div>
                <h4 className="font-headline-sm text-body-md font-bold text-on-surface group-hover:text-primary transition-colors">
                  Barbados
                </h4>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Grid-Tied Storage
                </span>
              </div>
            </div>
            {/* 4. Cayman Islands */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm hover:shadow-md hover:bg-surface-container-highest/50 transition-all cursor-default flex flex-col justify-between min-h-[110px] group">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="material-symbols-outlined text-tertiary group-hover:text-primary transition-colors text-[24px]">
                  location_on
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                  GCM / CYB
                </span>
              </div>
              <div>
                <h4 className="font-headline-sm text-body-md font-bold text-on-surface group-hover:text-primary transition-colors">
                  Cayman Islands
                </h4>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Luxury Off-Grid
                </span>
              </div>
            </div>
            {/* 5. Dominican Republic */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm hover:shadow-md hover:bg-surface-container-highest/50 transition-all cursor-default flex flex-col justify-between min-h-[110px] group">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="material-symbols-outlined text-tertiary group-hover:text-primary transition-colors text-[24px]">
                  location_on
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                  PUJ / SDQ
                </span>
              </div>
              <div>
                <h4 className="font-headline-sm text-body-md font-bold text-on-surface group-hover:text-primary transition-colors">
                  Dominican Rep.
                </h4>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Resort Microgrids
                </span>
              </div>
            </div>
            {/* 6. Turks & Caicos */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm hover:shadow-md hover:bg-surface-container-highest/50 transition-all cursor-default flex flex-col justify-between min-h-[110px] group">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="material-symbols-outlined text-tertiary group-hover:text-primary transition-colors text-[24px]">
                  location_on
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                  PLS / GDT
                </span>
              </div>
              <div>
                <h4 className="font-headline-sm text-body-md font-bold text-on-surface group-hover:text-primary transition-colors">
                  Turks &amp; Caicos
                </h4>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  High-Yield Solar
                </span>
              </div>
            </div>
            {/* 7. St. Lucia */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm hover:shadow-md hover:bg-surface-container-highest/50 transition-all cursor-default flex flex-col justify-between min-h-[110px] group">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="material-symbols-outlined text-tertiary group-hover:text-primary transition-colors text-[24px]">
                  location_on
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                  UVF / SLU
                </span>
              </div>
              <div>
                <h4 className="font-headline-sm text-body-md font-bold text-on-surface group-hover:text-primary transition-colors">
                  St. Lucia
                </h4>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Eco-Hospitality
                </span>
              </div>
            </div>
            {/* 8. Puerto Rico */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm hover:shadow-md hover:bg-surface-container-highest/50 transition-all cursor-default flex flex-col justify-between min-h-[110px] group">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="material-symbols-outlined text-tertiary group-hover:text-primary transition-colors text-[24px]">
                  location_on
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                  SJU / BQN
                </span>
              </div>
              <div>
                <h4 className="font-headline-sm text-body-md font-bold text-on-surface group-hover:text-primary transition-colors">
                  Puerto Rico
                </h4>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Critical Backup
                </span>
              </div>
            </div>
            {/* 9. Antigua & Barbuda */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm hover:shadow-md hover:bg-surface-container-highest/50 transition-all cursor-default flex flex-col justify-between min-h-[110px] group">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="material-symbols-outlined text-tertiary group-hover:text-primary transition-colors text-[24px]">
                  location_on
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                  ANU
                </span>
              </div>
              <div>
                <h4 className="font-headline-sm text-body-md font-bold text-on-surface group-hover:text-primary transition-colors">
                  Antigua &amp; Barbuda
                </h4>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Coastal Hybrid
                </span>
              </div>
            </div>
            {/* 10. St. Maarten */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm hover:shadow-md hover:bg-surface-container-highest/50 transition-all cursor-default flex flex-col justify-between min-h-[110px] group">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="material-symbols-outlined text-tertiary group-hover:text-primary transition-colors text-[24px]">
                  location_on
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                  SXM
                </span>
              </div>
              <div>
                <h4 className="font-headline-sm text-body-md font-bold text-on-surface group-hover:text-primary transition-colors">
                  St. Maarten
                </h4>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Marine Grade PV
                </span>
              </div>
            </div>
            {/* 11. USVI */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm hover:shadow-md hover:bg-surface-container-highest/50 transition-all cursor-default flex flex-col justify-between min-h-[110px] group">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="material-symbols-outlined text-tertiary group-hover:text-primary transition-colors text-[24px]">
                  location_on
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                  STT / STX
                </span>
              </div>
              <div>
                <h4 className="font-headline-sm text-body-md font-bold text-on-surface group-hover:text-primary transition-colors">
                  U.S. Virgin Islands
                </h4>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Residential &amp; Commercial
                </span>
              </div>
            </div>
            {/* 12. Grenada */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm hover:shadow-md hover:bg-surface-container-highest/50 transition-all cursor-default flex flex-col justify-between min-h-[110px] group">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="material-symbols-outlined text-tertiary group-hover:text-primary transition-colors text-[24px]">
                  location_on
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                  GND
                </span>
              </div>
              <div>
                <h4 className="font-headline-sm text-body-md font-bold text-on-surface group-hover:text-primary transition-colors">
                  Grenada
                </h4>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Smart Storage
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Single Call-to-Action Bottom Banner */}
      <section className="w-full py-space-3xl lg:py-space-4xl bg-gradient-to-b from-surface to-surface-container-lowest relative z-10 border-t border-outline-variant/30 overflow-hidden">
        <div className="max-w-[1360px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin-desktop">
          <div className="text-center max-w-3xl mx-auto mb-space-2xl md:mb-space-3xl">
            <div className="inline-flex items-center gap-space-xs px-space-md py-space-2xs rounded-full bg-primary-fixed/30 text-on-primary-fixed-variant mb-space-sm">
              <span className="material-symbols-outlined text-[18px] text-primary">
                linear_scale
              </span>
              <span className="font-label-md text-label-md uppercase tracking-wider font-bold">
                The Consultation Process
              </span>
            </div>
            <h2 className="font-headline-lg text-headline-md md:text-headline-lg text-on-surface font-bold tracking-tight mb-space-xs">
              Simple 3-Step Path to Energy Independence
            </h2>
            <p className="font-body-lg text-body-md md:text-body-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
              A transparent, engineered walkthrough designed to take your island
              property from concept to validated solar and storage
              specification.
            </p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-space-lg md:p-space-2xl shadow-sm">
            <div className="relative">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-xl md:gap-space-2xl relative items-stretch">
                {/* Step 01 */}
                <div className="flex flex-col relative justify-between">
                  <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <div className="flex items-center justify-between w-full mb-space-lg">
                      <div className="flex items-center gap-space-sm">
                        <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary font-headline-sm text-[16px] font-bold flex items-center justify-center shadow-md shrink-0">
                          01
                        </div>
                        <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold bg-primary-fixed/30 px-space-sm py-1 rounded-full">
                          Step 01
                        </span>
                      </div>
                      {/* Desktop Connector to Step 2 */}
                      <div className="hidden md:flex items-center text-outline-variant/60 ml-auto pr-2">
                        <span className="material-symbols-outlined text-[20px]">
                          arrow_forward
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-space-xs mb-space-2xs">
                      <span className="material-symbols-outlined text-primary text-[20px]">
                        pin_drop
                      </span>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                        Select Island Location
                      </h3>
                    </div>
                    <p className="font-body-md text-body-sm text-on-surface-variant leading-relaxed mb-space-md">
                      Choose your Caribbean location or archipelago to assess
                      local solar irradiance, utility tariff benchmarks, and
                      coastal wind ratings.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-on-surface-variant font-label-md text-[12px] bg-surface-container-low px-space-sm py-1 rounded-lg w-fit mx-auto md:mx-0">
                    <span className="material-symbols-outlined text-[16px] text-primary">
                      map
                    </span>
                    <span>12 Island Codes Supported</span>
                  </div>
                </div>
                {/* Step 02 */}
                <div className="flex flex-col relative justify-between">
                  <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <div className="flex items-center justify-between w-full mb-space-lg">
                      <div className="flex items-center gap-space-sm">
                        <div className="w-10 h-10 rounded-full bg-secondary text-on-secondary font-headline-sm text-[16px] font-bold flex items-center justify-center shadow-md shrink-0">
                          02
                        </div>
                        <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-bold bg-secondary-fixed/50 px-space-sm py-1 rounded-full">
                          Step 02
                        </span>
                      </div>
                      {/* Desktop Connector to Step 3 */}
                      <div className="hidden md:flex items-center text-outline-variant/60 ml-auto pr-2">
                        <span className="material-symbols-outlined text-[20px]">
                          arrow_forward
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-space-xs mb-space-2xs">
                      <span className="material-symbols-outlined text-secondary text-[20px]">
                        tune
                      </span>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                        Share Property &amp; Energy Needs
                      </h3>
                    </div>
                    <p className="font-body-md text-body-sm text-on-surface-variant leading-relaxed mb-space-md">
                      Briefly outline estimated power usage, villa or resort
                      roof footprint, and essential backup load priorities in
                      under 2 minutes.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-on-surface-variant font-label-md text-[12px] bg-surface-container-low px-space-sm py-1 rounded-lg w-fit mx-auto md:mx-0">
                    <span className="material-symbols-outlined text-[16px] text-secondary">
                      schedule
                    </span>
                    <span>Takes &lt; 2 Minutes</span>
                  </div>
                </div>
                {/* Step 03 */}
                <div className="flex flex-col relative justify-between">
                  <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <div className="flex items-center justify-between w-full mb-space-lg">
                      <div className="flex items-center gap-space-sm">
                        <div className="w-10 h-10 rounded-full bg-tertiary text-on-tertiary font-headline-sm text-[16px] font-bold flex items-center justify-center shadow-md shrink-0">
                          03
                        </div>
                        <span className="font-label-sm text-label-sm uppercase tracking-wider text-tertiary font-bold bg-tertiary-fixed/50 px-space-sm py-1 rounded-full">
                          Step 03
                        </span>
                      </div>
                      <div className="hidden md:flex items-center text-outline-variant/60 ml-auto pr-2">
                        <span className="material-symbols-outlined text-[20px] text-tertiary">
                          done_all
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-space-xs mb-space-2xs">
                      <span className="material-symbols-outlined text-tertiary text-[20px]">
                        verified
                      </span>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                        Custom Plan &amp; Quote in 24–48h
                      </h3>
                    </div>
                    <p className="font-body-md text-body-sm text-on-surface-variant leading-relaxed mb-space-md">
                      Our microgrid engineers model your tailored solar plus
                      battery storage specs, financial ROI projections, and
                      turnkey procurement plan.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-on-surface-variant font-label-md text-[12px] bg-surface-container-low px-space-sm py-1 rounded-lg w-fit mx-auto md:mx-0">
                    <span className="material-symbols-outlined text-[16px] text-tertiary">
                      engineering
                    </span>
                    <span>Engineering Feasibility Report</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="w-full py-space-3xl lg:py-space-4xl bg-gradient-to-br from-primary via-primary-container to-tertiary text-on-primary relative overflow-hidden">
        {/* Ambient Energy Rings Vector */}
        <div className="absolute -right-24 -bottom-24 w-96 h-96 rounded-full bg-secondary-container/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -top-20 w-80 h-80 rounded-full bg-primary-fixed/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 max-w-[1360px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin-desktop text-center flex flex-col items-center">
          <span className="font-label-md text-label-md uppercase tracking-widest text-secondary-fixed mb-space-xs font-bold">
            Zero Friction Deployment
          </span>
          <h2 className="font-headline-lg text-headline-md md:text-headline-lg max-w-2xl font-bold tracking-tight mb-space-md">
            Ready for energy independence across the islands?
          </h2>
          <p className="font-body-lg text-body-md md:text-body-lg text-on-primary-container max-w-xl mb-space-xl">
            Receive an engineered feasibility analysis, estimated solar yield,
            and custom battery storage capacity modeled specifically for your
            Caribbean property.
          </p>
          {/* The Single Bottom Banner CTA Button */}
          <a
            className="inline-flex items-center justify-center gap-space-xs bg-secondary-container text-on-secondary-container font-headline-sm text-body-md font-bold px-space-2xl py-space-md rounded-lg shadow-2xl hover:bg-secondary-fixed-dim transition-all duration-300 transform hover:scale-105"
            href="/consultation"
          >
            <span>Get Your Free Assessment</span>
            <span className="material-symbols-outlined text-[20px]">
              chevron_right
            </span>
          </a>
        </div>
      </section>
    </div>
  </main>
  <footer className="w-full bg-surface-container-low py-space-3xl">
    <div className="max-w-[1360px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin-desktop">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter-desktop items-start pb-space-2xl">
        <div className="md:col-span-6 flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-xs mb-space-2xs">
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Sol &amp; Tide Energy
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
            Engineering hurricane-grade microgrid solutions, hybrid inverters,
            and utility battery telemetry engineered for resilience across the
            Caribbean archipelago.
          </p>
        </div>
        <div className="md:col-span-6 flex flex-col md:items-end gap-space-2xs">
          <span className="font-label-md text-label-md uppercase text-tertiary font-bold tracking-wider">
            Regional Footprint
          </span>
          <p className="font-body-sm text-body-sm text-on-surface-variant md:text-right max-w-sm">
            Operating across the Bahamas, Cayman Islands, Turks &amp; Caicos,
            USVI, and Eastern Caribbean microgrids.
          </p>
        </div>
      </div>
      <div className="pt-space-lg flex flex-col sm:flex-row items-center justify-between gap-space-md bg-surface-container-high/30 rounded-xl px-space-lg py-space-md">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          © 2025 Sol &amp; Tide Energy Corp. All rights reserved. Climate-native
          island infrastructure. Version {packageJson.version}
        </p>
        <div className="flex items-center gap-space-lg">
          <a
            className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
            data-path="privacy-policy"
            href="#"
          >
            Privacy Policy
          </a>
          <a
            className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
            data-path="terms-of-service"
            href="#"
          >
            Terms of Service
          </a>
        </div>
      </div>
    </div>
  </footer>
    </div>
  );
}
