const {
  callToAction,
  chooseVariant,
  escapeHtml,
  linkCards,
  metaDescription,
  pageShell,
  taskList,
} = require('./shared');

function serviceSections(service, editorial, appUrl) {
  const fallbackTasks = service.tags.slice(0, 8);
  const tasks = editorial?.reviewStatus === 'approved' ? editorial.tasks : fallbackTasks;
  const serviceDescription = editorial?.reviewStatus === 'approved'
    ? `
      <section>
        <h2>About ${escapeHtml(service.name.toLowerCase())}</h2>
        <p>${escapeHtml(editorial.description)}</p>
      </section>
    `
    : `
      <section>
        <h2>About this service</h2>
        <p>
          Explore common ${escapeHtml(service.name.toLowerCase())} tasks and learn how to describe
          your request. Detailed service information is being reviewed.
        </p>
      </section>
    `;
  const taskSection = tasks.length
    ? `
      <section>
        <h2>Common tasks</h2>
        ${taskList(tasks)}
      </section>
    `
    : '';
  return `${serviceDescription}${taskSection}${callToAction(appUrl)}`;
}

function renderServiceDescription({ service, editorial, cities, indexableRoutes, appUrl, canonicalBase, faqItems }) {
  const route = `/services/${service.slug}/`;
  return pageShell({
    title: `${service.name} Services | Aasaanly`,
    description: metaDescription(
      `${service.name}:`,
      editorial?.reviewStatus === 'approved'
        ? editorial.description
        : `Request a ${service.name} provider today. Explore common tasks and request-preparation guidance. Provider availability varies by location.`,
    ),
    route,
    canonicalBase,
    appUrl,
    indexable: indexableRoutes.has(route) && editorial?.reviewStatus === 'approved',
    crumbs: [{ label: 'Services', route: '/services/' }, { label: service.name }],
    indexableRoutes,
    faqItems,
    body: `
      <section class="hero">
        <p class="eyebrow">${escapeHtml(service.category)}</p>
        <h1>${escapeHtml(service.name)} services</h1>
        <p>${chooseVariant(route, 'service.intro', [
          'Review the tasks this service can cover and prepare details before submitting a request.',
          'Explore the work this service covers and gather useful details before making a request.',
        ])}</p>
        <p class="notice">
          Provider availability and responses vary by location. A request does not guarantee a match.
        </p>
      </section>
      ${serviceSections(service, editorial, appUrl)}
      ${cities.length ? `
        <section>
          <h2>${escapeHtml(service.name)} by city</h2>
          ${linkCards(
            cities,
            (city) => `/services/${service.slug}/${city.slug}/`,
            (city) => city.state,
            indexableRoutes,
          )}
        </section>
      ` : ''}
    `,
  });
}

module.exports = { renderServiceDescription };
