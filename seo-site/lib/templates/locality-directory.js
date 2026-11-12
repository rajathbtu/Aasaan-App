const { chooseVariant, escapeHtml, linkCards, metaDescription, pageShell } = require('./shared');

function renderLocalityDirectory({ city, locality, editorial, services, indexableRoutes, appUrl, canonicalBase, faqItems }) {
  const route = `/services/${city.slug}/${locality.slug}/`;
  const approved = editorial?.reviewStatus === 'approved';
  const introduction = `Browse home service categories near ${escapeHtml(locality.name)}, ${escapeHtml(city.name)} and choose the work you need.`;
  const availability = chooseVariant(route, 'locality.availability', [
    'Provider availability and responses vary by area. A request does not guarantee a match.',
    'Provider availability and responses may differ by area. Submitting a request does not guarantee a match.',
  ]);
  const serviceCards = linkCards(
    services,
    (service) => `/services/${service.slug}/${city.slug}/${locality.slug}/`,
    (service) => service.category,
    indexableRoutes,
  );
  return pageShell({
    title: `Services near ${locality.name} | Aasaanly`,
    description: metaDescription(
      `Services near ${locality.name}, ${city.name}:`,
      `Explore home service categories and request help near ${locality.name}, ${city.name}.`,
    ),
    route,
    canonicalBase,
    appUrl,
    indexable: indexableRoutes.has(route) && approved,
    crumbs: [{ label: 'Services', route: '/services/' }, { label: city.name, route: `/services/${city.slug}/` }, { label: locality.name }],
    indexableRoutes,
    faqItems,
    body: `
      <section class="hero">
        <p class="eyebrow">${escapeHtml(city.name)}, ${escapeHtml(city.state)}</p>
        <h1>Services near ${escapeHtml(locality.name)}</h1>
        <p>${introduction}</p>
        <p class="notice">${availability}</p>
      </section>
      <section>
        <h2>Browse services in this area</h2>
        ${serviceCards}
      </section>
    `,
  });
}

module.exports = { renderLocalityDirectory };
