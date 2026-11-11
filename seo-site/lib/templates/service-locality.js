const {
  chooseVariant,
  escapeHtml,
  internalLink,
  metaDescription,
  pageShell,
  serviceTrustSignals,
  serviceLocationDescription,
  serviceLandingSections,
} = require('./shared');

function renderServiceLocality({
  service,
  city,
  locality,
  serviceContent,
  locationContent,
  localityContent,
  services,
  indexableRoutes,
  appUrl,
  canonicalBase,
  faqItems,
}) {
  const route = `/services/${service.slug}/${city.slug}/${locality.slug}/`;
  const approved = serviceContent?.reviewStatus === 'approved'
    && locationContent?.reviewStatus === 'approved'
    && localityContent?.reviewStatus === 'approved';
  const description = approved
    ? serviceLocationDescription(
      route,
      serviceContent.locationDescriptionVariants,
      `${locality.name}, ${city.name}`,
    )
    : `Request a ${service.name} provider near ${locality.name}. Explore service information and get started today. Provider availability varies by area.`;
  const title = `${service.name} near ${locality.name} | Aasaanly`;
  const heroLead = approved
    ? escapeHtml(description)
    : `Describe the ${escapeHtml(service.name.toLowerCase())} work you need and confirm your location near ${escapeHtml(locality.name)} in ${escapeHtml(city.name)}.`;
  const availability = chooseVariant(route, 'service-locality.availability', [
    `Availability of service experts and response on your request may vary in ${escapeHtml(locality.name)}.`,
    `Expert availability varies from area to area and may differ in ${escapeHtml(locality.name)}.`,
  ]);
  const cityLink = internalLink(
    `/services/${service.slug}/${city.slug}/`,
    `Explore ${service.name.toLowerCase()} in ${city.name}`,
    indexableRoutes,
  );
  const landingSections = serviceLandingSections({
    route,
    service,
    city,
    locality,
    serviceContent,
    services,
    indexableRoutes,
    appUrl,
  });
  return pageShell({
    title,
    description: metaDescription(
      `${service.name} near ${locality.name}, ${city.name}:`,
      description,
    ),
    route,
    canonicalBase,
    appUrl,
    indexable: indexableRoutes.has(route) && approved,
    crumbs: [{ label: 'Services', route: '/services/' }, { label: service.name, route: `/services/${service.slug}/` }, { label: city.name, route: `/services/${service.slug}/${city.slug}/` }, { label: locality.name }],
    indexableRoutes,
    faqItems,
    body: `
      <section class="hero">
        <p class="eyebrow">
          ${escapeHtml(service.name)} near ${escapeHtml(locality.name)}, ${escapeHtml(city.name)}
        </p>
        <h1>Find ${escapeHtml(service.name)} near ${escapeHtml(locality.name)}, ${city.name}</h1>
        <p class="hero-lead">${heroLead}</p>
        <p class="notice">${availability}</p>
        <p><a class="button" href="${escapeHtml(appUrl)}">Find ${escapeHtml(service.name)} help</a></p>
        ${serviceTrustSignals(appUrl)}
        <p>${cityLink}</p>
      </section>
      ${landingSections}
    `,
  });
}

module.exports = { renderServiceLocality };
