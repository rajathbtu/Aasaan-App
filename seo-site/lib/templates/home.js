const { callToAction, chooseVariant, linkCards, pageShell } = require('./shared');

function renderHome({ services, appUrl, canonicalBase, indexableRoutes, faqItems }) {
  return pageShell({
    title: 'Local Services and Home Help | Aasaanly',
    description: 'Book verified local service providers with Aasaanly. Explore plumbing, electrical, cleaning services in your area. Request a provider today.',
    route: '/',
    canonicalBase,
    appUrl,
    indexable: indexableRoutes.has('/'),
    crumbs: [],
    indexableRoutes,
    faqItems,
    body: `
      <section class="hero">
        <p class="eyebrow">Local service requests</p>
        <h1>Find help for everyday services with Aasaanly</h1>
        <p>${chooseVariant('/', 'home.intro', [
          'Explore services, choose the help you need, then continue to Aasaanly to submit a request.',
          'Browse services, select the help you need, and continue to Aasaanly to submit a request.',
        ])}</p>
        <p class="notice">
          Provider availability varies by location. A request does not guarantee a provider match.
        </p>
        ${callToAction(appUrl)}
      </section>
      <section>
        <h2>Explore services</h2>
        ${linkCards(
          services,
          (service) => `/services/${service.slug}/`,
          () => '',
          indexableRoutes,
        )}
      </section>
    `,
  });
}

module.exports = { renderHome };
