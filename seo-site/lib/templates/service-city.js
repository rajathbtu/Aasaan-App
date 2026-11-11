const {
  chooseVariant,
  escapeHtml,
  metaDescription,
  pageShell,
  serviceTrustSignals,
  serviceLocationDescription,
  serviceLandingSections,
} = require('./shared');

function renderServiceCity({
  service,
  city,
  serviceContent,
  locationContent,
  services,
  indexableRoutes,
  appUrl,
  canonicalBase,
  faqItems,
}) {
  const route = `/services/${service.slug}/${city.slug}/`;
  const approved = serviceContent?.reviewStatus === 'approved' && locationContent?.reviewStatus === 'approved';
  const description = approved
    ? serviceLocationDescription(route, serviceContent.locationDescriptionVariants, city.name)
    : `Request a ${service.name} provider in ${city.name}. Explore service information and get started today. Provider availability varies by area.`;
  const heroLead = approved
    ? escapeHtml(description)
    : `Describe the ${escapeHtml(service.name.toLowerCase())} work you need and confirm your service location in ${escapeHtml(city.name)}.`;
  const availability = chooseVariant(route, 'service-city.availability', [
    `Provider availability and responses vary across ${escapeHtml(city.name)}. A request does not guarantee a match.`,
    `Provider availability and responses may differ across ${escapeHtml(city.name)}. Submitting a request does not guarantee a match.`,
  ]);
  const landingSections = serviceLandingSections({
    route,
    service,
    serviceContent,
    city,
    services,
    indexableRoutes,
    appUrl,
  });
  
  return pageShell({
    title: `${service.name} in ${city.name} | Aasaanly`,
    description: metaDescription(
      `${service.name} in ${city.name}:`,
      description,
    ),
    route,
    canonicalBase,
    appUrl,
    indexable: indexableRoutes.has(route) && approved,
    crumbs: [{ label: 'Services', route: '/services/' }, { label: service.name, route: `/services/${service.slug}/` }, { label: city.name }],
    indexableRoutes,
    faqItems,
    body: `
      <section class="hero">
        <p class="eyebrow">
          ${escapeHtml(service.name)} in ${escapeHtml(city.name)}, ${escapeHtml(city.state)}
        </p>
        <h1>Find ${escapeHtml(service.name)} in ${escapeHtml(city.name)}</h1>
        <p class="hero-lead">${heroLead}</p>
        <p class="notice">${availability}</p>
        <p><a class="button" href="${escapeHtml(appUrl)}">Find ${escapeHtml(service.name.toLowerCase())} help</a></p>
        ${serviceTrustSignals(appUrl)}
      </section>
      ${landingSections}
    `,
  });
}

module.exports = { renderServiceCity };
