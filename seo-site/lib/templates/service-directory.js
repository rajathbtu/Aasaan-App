const { chooseVariant, linkCards, pageShell } = require('./shared');

function renderServiceDirectory({ services, cities, indexableRoutes, appUrl, canonicalBase, faqItems }) {
  return pageShell({
    title: 'Services | Aasaanly',
    description: 'Find verified local service providers for home services. Browse plumbing, electrical, cleaning, and more. Request a service provider in your area today.',
    route: '/services/',
    canonicalBase,
    appUrl,
    indexable: indexableRoutes.has('/services/'),
    crumbs: [{ label: 'Services', route: '/services/' }],
    indexableRoutes,
    faqItems,
    body: `
      <section class="hero">
        <h1>Explore services</h1>
        <p>${chooseVariant('/services/', 'directory.intro', [
          'Choose a service to review its common tasks and request-preparation guidance. Provider availability varies by location.',
          'Browse service tasks and request-preparation guidance before choosing a service. Provider availability varies by location.',
        ])}</p>
      </section>
      <section aria-labelledby="services-heading">
        <h2 id="services-heading">Service directory</h2>
        ${linkCards(
          services,
          (service) => `/services/${service.slug}/`,
          (service) => service.category,
          indexableRoutes,
        )}
      </section>
      ${cities.length ? `
        <section>
          <h2>Browse by city</h2>
          ${linkCards(
            cities,
            (city) => `/services/${city.slug}/`,
            (city) => city.state,
            indexableRoutes,
          )}
        </section>
      ` : ''}
    `,
  });
}

module.exports = { renderServiceDirectory };
