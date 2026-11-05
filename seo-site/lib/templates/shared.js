const { escapeHtml } = require('../utils');

function chooseVariant(route, key, variants) {
  if (typeof route !== 'string' || !route || typeof key !== 'string' || !key) {
    throw new Error('Template variants require a route and a stable key.');
  }
  if (!Array.isArray(variants) || variants.length === 0
    || variants.some((variant) => typeof variant !== 'string' || !variant.trim())) {
    throw new Error(`Template variant "${key}" must contain non-empty strings.`);
  }

  let hash = 2166136261;
  for (const character of `${route}\0${key}`) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return variants[(hash >>> 0) % variants.length];
}

function serviceLocationDescription(route, variants, location) {
  return chooseVariant(route, 'service-location.description', variants)
    .replaceAll('{{location}}', location);
}

function internalLink(route, label, indexableRoutes, className = '') {
  const text = escapeHtml(label);
  const classAttribute = className ? ` class="${className}"` : '';
  return indexableRoutes.has(route)
    ? `<a${classAttribute} href="${route}">${text}</a>`
    : `<span${classAttribute}>${text}</span>`;
}

function pageShell({ title, description, route, canonicalBase, appUrl, body, crumbs, indexable, indexableRoutes, faqItems }) {
  const canonical = `${canonicalBase}${route}`;
  const breadcrumbItems = [{ label: 'Home', route: '/' }, ...crumbs];
  const breadcrumbHtml = breadcrumbItems.map((item, index) => {
    const label = escapeHtml(item.label);
    const link = item.route && index < breadcrumbItems.length - 1 && indexableRoutes.has(item.route)
      ? `<a href="${item.route}">${label}</a>`
      : label;
    return `
      <li>${link}</li>
    `;
  }).join('');
  const graphEntries = [
    { '@type': 'WebPage', name: title, description, url: canonical },
    {
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        item: `${canonicalBase}${item.route || route}`,
      })),
    },
  ];

  if (faqItems && faqItems.length) {
    graphEntries.push({
      '@type': 'FAQPage',
      mainEntity: faqItems.map((item) => ({
        '@type': 'Question',
        name: escapeHtml(item.question),
        acceptedAnswer: {
          '@type': 'Answer',
          text: escapeHtml(item.answer),
        },
      })),
    });
  }

  const structuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': graphEntries,
  }).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="${indexable ? 'index,follow' : 'noindex,follow'}">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${escapeHtml(canonical)}">
    <link rel="stylesheet" href="/assets/seo-site.css">
    <script type="application/ld+json">${structuredData}</script>
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <header>
      ${internalLink('/', 'Aasaanly', indexableRoutes, 'brand')}
      <nav aria-label="Main navigation">
        ${internalLink('/services/', 'Services', indexableRoutes)}
        <a href="${escapeHtml(appUrl)}">Open the app</a>
      </nav>
    </header>
    <main class="wrap" id="main">
      <nav class="crumbs" aria-label="Breadcrumb">
        <ol>${breadcrumbHtml}</ol>
      </nav>
      ${body}
    </main>
    <footer>
      <div class="wrap">
        Provider availability and responses vary by location. A request does not guarantee a provider match.
      </div>
    </footer>
  </body>
</html>`;
}

function linkCards(items, routeFor, summaryFor, indexableRoutes) {
  const cards = items.map((item) => {
    const route = routeFor(item);
    const summary = summaryFor(item);
    const title = escapeHtml(item.name);
    const label = indexableRoutes.has(route) ? `<a href="${route}">${title}</a>` : `<span>${title}</span>`;
    return `
      <li>
        ${label}
        ${summary ? `<p>${escapeHtml(summary)}</p>` : ''}
      </li>
    `;
  }).join('');

  return `
    <ul class="cards">
      ${cards}
    </ul>
  `;
}

function taskList(items) {
  return `
    <ul class="tags">
      ${items.map((item) => `
        <li>${escapeHtml(item)}</li>
      `).join('')}
    </ul>
  `;
}

function renderFaqSection(items) {
  if (!items.length) return '';
  return `
    <section class="faq" aria-labelledby="faq-heading">
      <h2 id="faq-heading">Frequently asked questions</h2>
      <dl>
        ${items.map((item) => `
          <div class="faq-item">
            <dt>${escapeHtml(item.question)}</dt>
            <dd>${escapeHtml(item.answer)}</dd>
          </div>
        `).join('')}
      </dl>
    </section>
  `;
}

function metaDescription(prefix, details) {
  const clean = (value) => String(value).replace(/&/g, ' and ');
  const text = `${clean(prefix)} ${clean(details)}`.replace(/\s+/g, ' ').trim();
  if (text.length <= 155) return text;
  const shortened = text.slice(0, 152);
  const boundary = shortened.lastIndexOf(' ');
  return `${shortened.slice(0, boundary > 100 ? boundary : 152).trim()}...`;
}

function callToAction(appUrl) {
  return `
    <p>
      <a class="button" href="${escapeHtml(appUrl)}">Continue with Aasaanly</a>
    </p>
  `;
}

function serviceTrustSignals(appUrl) {
  return `
    <ul class="trust-line" aria-label="Aasaanly service benefits">
      <li>ID-verified experts</li>
      <li>Rated by customers like you</li>
      <li>Discuss price and negotiate directly</li>
      <li>Pay providers directly with no commission on service jobs</li>
      <li>Free to request a service; optional paid boosts and provider plans may cost extra</li>
    </ul>
    <p class="app-download">
      <a class="button button-secondary" href="${escapeHtml(appUrl)}">Download app</a>
    </p>
  `;
}

function serviceLandingSections({
  route,
  service,
  serviceContent,
  city,
  locality,
  services,
  indexableRoutes,
  appUrl,
}) {
  const tasks = serviceContent?.reviewStatus === 'approved'
    ? serviceContent.tasks
    : service.tags.slice(0, 8);
  const taskCards = tasks.map((task, index) => `
    <li>
      <span class="task-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
      <div>
        <strong>${escapeHtml(task)}</strong>
      </div>
    </li>
  `).join('');
  const areaName = locality ? locality.name : city.name;
  const areaContent = locality
    ? `Confirm your exact location near ${locality.name}, ${city.name} in Aasaanly when submitting a ${service.name.toLowerCase()} request.`
    : `Confirm your exact location in ${city.name} in Aasaanly when submitting a ${service.name.toLowerCase()} request.`;
  const areaLinks = locality
    ? linkCards(
      services.filter((item) => item.slug !== service.slug),
      (item) => `/services/${item.slug}/${city.slug}/${locality.slug}/`,
      (item) => item.category,
      indexableRoutes,
    )
    : city.localities.length
      ? linkCards(
        city.localities,
        (item) => `/services/${service.slug}/${city.slug}/${item.slug}/`,
        () => `Explore ${service.name.toLowerCase()} guidance for this area.`,
        indexableRoutes,
      )
      : '';
  const areaLinksHeading = locality
    ? `Explore other services near ${escapeHtml(locality.name)}`
    : `${escapeHtml(service.name)} by area in ${escapeHtml(city.name)}`;
  const areaLinksSection = areaLinks
    ? `
      <section aria-labelledby="area-links-heading">
        <h2 id="area-links-heading">${areaLinksHeading}</h2>
        ${areaLinks}
      </section>
    `
    : '';
  const tasksEyebrow = chooseVariant(route, 'tasks.eyebrow', [
    'Start with the work',
    'Choose the work you need',
  ]);
  const tasksIntro = chooseVariant(route, 'tasks.intro', [
    'Review the supported task types and choose the one that best describes your request.',
    'Choose the task type that most closely matches the work you need.',
  ]);
  const processIntro = chooseVariant(route, 'process.intro', [
    'Choose the work, describe the issue, and share your location. If a provider responds, confirm the scope before proceeding.',
    'Tell us what needs attention and where. If a provider responds, agree on the work details before proceeding.',
  ]);
  return `
    <section class="landing-section" id="service-tasks" aria-labelledby="service-tasks-heading">
      <div class="section-heading">
        <p class="eyebrow">${tasksEyebrow}</p>
        <h2 id="service-tasks-heading">What do you need help with?</h2>
        <p>${tasksIntro}</p>
      </div>
      <ul class="service-tasks">
        ${taskCards}
      </ul>
    </section>

    <section class="landing-section process-section" id="how-it-works" aria-labelledby="how-it-works-heading">
      <div class="section-heading">
        <p class="eyebrow">A clear next step</p>
        <h2 id="how-it-works-heading">How a service request works</h2>
        <p>${processIntro}</p>
      </div>
      <ol class="process-steps">
        <li>
          <strong>Choose the service</strong>
          <span>Select the task that best matches the work.</span>
        </li>
        <li>
          <strong>Describe the request</strong>
          <span>Explain the issue and include helpful details.</span>
        </li>
        <li>
          <strong>Share your location</strong>
          <span>Confirm ${escapeHtml(areaName)} or the precise service address in Aasaanly.</span>
        </li>
        <li>
          <strong>Confirm before work</strong>
          <span>If a provider responds, agree on scope, price, and timing before proceeding.</span>
        </li>
      </ol>
    </section>

    <section class="landing-section cost-guidance" aria-labelledby="cost-heading">
      <div>
        <p class="eyebrow">Before you agree</p>
        <h2 id="cost-heading">
          Understanding ${escapeHtml(service.name.toLowerCase())} costs in ${escapeHtml(areaName)}
        </h2>
        <p>
          There is no single price for every job. The cost may depend on the work, labour, and any
          parts or materials needed. Ask for the full price before agreeing to the work.
        </p>
      </div>
      <div class="cost-check">
        <h3>Before agreeing, confirm</h3>
        <ul>
          <li>Which tasks are included in the quoted price.</li>
          <li>Whether parts, materials, or a visit are charged separately.</li>
          <li>Any additional labour charges and expected timing.</li>
        </ul>
      </div>
    </section>

    <section class="landing-section area-context" aria-labelledby="area-context-heading">
      <p class="eyebrow">Local request details</p>
      <h2 id="area-context-heading">
        ${escapeHtml(service.name)} near ${escapeHtml(areaName)}
      </h2>
      <p>${escapeHtml(areaContent)}</p>
      <p class="notice">
        Provider coverage, responses, and availability can vary by location.
        Submitting a request does not guarantee a match.
      </p>
    </section>

    ${areaLinksSection}

    <section class="landing-cta" id="request" aria-labelledby="request-heading">
      <div>
        <p class="eyebrow">Ready when you are</p>
        <h2 id="request-heading">
          Request ${escapeHtml(service.name.toLowerCase())} help
          ${locality ? `near ${escapeHtml(locality.name)}` : `in ${escapeHtml(city.name)}`}
        </h2>
        <p>Share the work details and confirm your service location to get started.</p>
      </div>
      ${callToAction(appUrl)}
    </section>
  `;
}

module.exports = {
  callToAction,
  chooseVariant,
  escapeHtml,
  internalLink,
  linkCards,
  metaDescription,
  pageShell,
  renderFaqSection,
  serviceTrustSignals,
  serviceLocationDescription,
  serviceLandingSections,
  taskList,
};
