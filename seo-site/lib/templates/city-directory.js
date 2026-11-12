const { chooseVariant, escapeHtml, linkCards, metaDescription, pageShell } = require('./shared');

function renderCityDirectory({ city, editorial, services, indexableRoutes, appUrl, canonicalBase, faqItems }) {
  const route = `/services/${city.slug}/`;
  const approved = editorial?.reviewStatus === 'approved';
  const introduction = `Browse home service categories in ${escapeHtml(city.name)}, ${escapeHtml(city.state)} and choose the work you need.`;
  const availability = chooseVariant(route, 'city.availability', [
    `Provider availability and responses can vary across ${escapeHtml(city.name)}. A request does not guarantee a match.`,
    `Availability and provider responses may vary across ${escapeHtml(city.name)}. Submitting a request does not guarantee a match.`,
  ]);
  const serviceCards = linkCards(
    services,
    (service) => `/services/${service.slug}/${city.slug}/`,
    (service) => service.category,
    indexableRoutes,
  );
  const localityCards = city.localities.length
    ? linkCards(
      city.localities,
      (locality) => `/services/${city.slug}/${locality.slug}/`,
      () => `Area in ${city.name}, ${city.state}.`,
      indexableRoutes,
    )
    : '';
  return pageShell({
    title: `Services in ${city.name} | Aasaanly`,
    description: metaDescription(
      `Services in ${city.name}, ${city.state}:`,
      `Explore home service categories and request help in ${city.name}, ${city.state}.`,
    ),
    route,
    canonicalBase,
    appUrl,
    indexable: indexableRoutes.has(route) && approved,
    crumbs: [{ label: 'Services', route: '/services/' }, { label: city.name }],
    indexableRoutes,
    faqItems,
    body: `
      <section class="hero">
        <p class="eyebrow">${escapeHtml(city.state)}</p>
        <h1>Services in ${escapeHtml(city.name)}</h1>
        <p>${introduction}</p>
        <p class="notice">${availability}</p>
      </section>
      <section>
        <h2>Browse service categories</h2>
        ${serviceCards}
      </section>
      ${city.localities.length ? `
        <section>
          <h2>Areas in ${escapeHtml(city.name)}</h2>
          ${localityCards}
        </section>
      ` : ''}
    `,
  });
}

module.exports = { renderCityDirectory };
