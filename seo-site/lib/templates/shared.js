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

function normalizeFaqPriority(priority) {
  const numericPriority = Number(priority);
  if (!Number.isInteger(numericPriority) || numericPriority < 0 || numericPriority > 2) {
    return 1;
  }
  return numericPriority;
}

function resolveFaqItems(items, context = {}) {
  const city = context.city?.name || 'your area';
  const locality = context.locality?.name || city;
  const values = {
    service: context.service?.name || 'service',
    city,
    locality,
    location: context.locality && context.city
      ? `${context.locality.name}, ${context.city.name}`
      : city,
  };
  return items
    .map((item) => {
      const resolve = (text) => text.replace(/\{\{([^{}]+)\}\}/g, (placeholder, key) => {
        if (!Object.prototype.hasOwnProperty.call(values, key)) {
          throw new Error(`Unsupported FAQ placeholder: ${placeholder}`);
        }
        return values[key];
      });
      return {
        ...item,
        priority: normalizeFaqPriority(item.priority),
        question: resolve(item.question),
        answer: resolve(item.answer),
      };
    })
    .sort((left, right) => normalizeFaqPriority(left.priority) - normalizeFaqPriority(right.priority));
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
  const brand = indexableRoutes.has('/')
    ? '<a class="brand" href="/" aria-label="Aasaanly home"><img src="/assets/brand/icon-180.png" alt="" width="36" height="36" decoding="async">Aasaanly</a>'
    : '<span class="brand"><img src="/assets/brand/icon-180.png" alt="" width="36" height="36" decoding="async">Aasaanly</span>';
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
    <meta name="theme-color" content="#10c16b">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/icon-32.png">
    <link rel="icon" type="image/png" sizes="512x512" href="/assets/brand/icon-512.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/assets/brand/icon-180.png">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${escapeHtml(canonical)}">
    <link rel="preload" href="/assets/fonts/inter-latin-variable.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="/assets/seo-site.css">
    <script type="application/ld+json">${structuredData}</script>
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <header>
      ${brand}
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
        Availability of service experts and responses may vary by location.
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
      <li>Directly pay to service experts without any commission</li>
      <li>Free to request a service</li>
    </ul>
    <p class="app-download">
      <a class="button button-secondary" href="${escapeHtml(appUrl)}">Download Aasaanly App</a>
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
  const requestArea = locality ? `near ${locality.name}`: `in ${city.name}`;
  const processHeading = `How to request ${service.name} ${requestArea} with Aasaanly?`;
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
    `Common ${service.name.toLowerCase()} tasks`,
    `Frequently requested ${service.name} tasks`,
  ]);
  const tasksIntro = chooseVariant(route, 'tasks.intro', [
    'Review the supported task types and choose the one that best describes your request.',
    'Choose the task type that most closely matches the work you need.',
  ]);
  const processIntro = chooseVariant(route, 'process.intro', [
    'Choose the work, describe the issue, and share work location. Once a service expert responds, discuss the details & negotiate directly.',
    'Tell us what needs attention and where. Once a service expert responds, agree on the work details before proceeding.',
  ]);
  return `
    <section class="landing-section" id="service-tasks" aria-labelledby="service-tasks-heading">
      <div class="section-heading">
        <p class="eyebrow">${escapeHtml(tasksEyebrow)}</p>
        <h2 id="service-tasks-heading">What do you need help with?</h2>
        <p>${tasksIntro}</p>
      </div>
      <ul class="service-tasks">
        ${taskCards}
      </ul>
    </section>

    <section class="landing-section process-section" id="how-it-works" aria-labelledby="how-it-works-heading">
      <div class="section-heading">
        <p class="eyebrow">How it works?</p>
        <h2 id="how-it-works-heading">${escapeHtml(processHeading)}</h2>
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
          <span>Confirm ${escapeHtml(requestArea)} or the precise service address in Aasaanly.</span>
        </li>
        <li>
          <strong>Confirm before work</strong>
          <span>Once an expert responds, agree on scope, price, and timing before proceeding.</span>
        </li>
      </ol>
    </section>

    <section class="landing-section cost-guidance" aria-labelledby="cost-heading">
      <div>
        <p class="eyebrow">Pricing charged by ${escapeHtml(service.name)} ${escapeHtml(requestArea)}</p>
        <h2 id="cost-heading">
          Understanding ${escapeHtml(service.name.toLowerCase())} charges ${escapeHtml(requestArea)}
        </h2>
        <p>
          Mention your exact requirements while creating a request. Directly discuss the work details and negotiate the price with the service expert before proceeding. Charges may vary based on the work scope, location, and other factors.
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

    ${areaLinksSection}

    <section class="landing-cta" id="request" aria-labelledby="request-heading">
      <div>
        <p class="eyebrow">Create a request ${escapeHtml(requestArea)}</p>
        <h2 id="request-heading">
          Request ${escapeHtml(service.name)} ${escapeHtml(requestArea)}
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
  resolveFaqItems,
  serviceTrustSignals,
  serviceLocationDescription,
  serviceLandingSections,
  taskList,
};
