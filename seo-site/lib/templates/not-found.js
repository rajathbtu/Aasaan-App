const { internalLink, pageShell } = require('./shared');

function renderNotFound({ appUrl, canonicalBase, indexableRoutes, faqItems }) {
  return pageShell({
    title: 'Page not found | Aasaanly',
    description: 'The requested Aasaanly page could not be found.',
    route: '/404.html',
    canonicalBase,
    appUrl,
    indexable: false,
    crumbs: [{ label: 'Page not found' }],
    indexableRoutes,
    faqItems,
    body: `
      <section class="hero">
        <h1>Page not found</h1>
        <p>Browse the services directory to find what you need.</p>
        ${internalLink('/services/', 'Browse services', indexableRoutes)}
      </section>
    `,
  });
}

module.exports = { renderNotFound };
