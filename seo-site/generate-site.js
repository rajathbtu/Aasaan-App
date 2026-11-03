const fs = require('node:fs');
const path = require('node:path');
const { readContent, readLocations, readServices } = require('./lib/data-loader');
const {
  renderCityDirectory,
  renderHome,
  renderLocalityDirectory,
  renderNotFound,
  renderServiceCity,
  renderServiceDirectory,
  renderServiceLocality,
  renderServiceDescription,
  renderFaqSection,
} = require('./lib/page-templates');
const { escapeHtml } = require('./lib/utils');

const root = path.resolve(__dirname, '..');

function assertApprovedRoutes(content, requirements) {
  for (const route of content.approvedRoutesForIndexing) {
    const dependencies = requirements.get(route);
    if (!dependencies) throw new Error(`editorial-content.json approves an unknown route: ${route}`);
    const approved = content.faqs.reviewStatus === 'approved' && dependencies.every((dependency) => {
      if (dependency.type === 'service') {
        return content.services[dependency.slug]?.reviewStatus === 'approved';
      }
      if (dependency.type === 'city') {
        return content.locations[dependency.slug]?.reviewStatus === 'approved';
      }
      return content.locations[dependency.citySlug]?.localities?.[dependency.slug]?.reviewStatus === 'approved';
    });
    if (!approved) {
      throw new Error(`Route cannot be approved until its required content and shared FAQs are reviewed: ${route}`);
    }
  }
}

function writeSitemap(output, siteUrl, urls) {
  const urlsetPrefix = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  const urlsetSuffix = '\n</urlset>\n';
  const maxBytes = 50 * 1024 * 1024;
  const chunks = [];
  let chunk = [];
  let chunkBytes = Buffer.byteLength(urlsetPrefix + urlsetSuffix);

  for (const url of urls) {
    if (Buffer.byteLength(url) >= 2048) {
      throw new Error(`URL exceeds the sitemap URL limit: ${url}`);
    }
    const entry = `<url><loc>${escapeHtml(url)}</loc></url>\n`;
    const entryBytes = Buffer.byteLength(entry);
    if (chunk.length && (chunk.length >= 50000 || chunkBytes + entryBytes > maxBytes)) {
      chunks.push(chunk);
      chunk = [];
      chunkBytes = Buffer.byteLength(urlsetPrefix + urlsetSuffix);
    }
    if (entryBytes + Buffer.byteLength(urlsetPrefix + urlsetSuffix) > maxBytes) {
      throw new Error(`URL exceeds the sitemap size limit: ${url}`);
    }
    chunk.push(entry);
    chunkBytes += entryBytes;
  }
  if (chunk.length || chunks.length === 0) chunks.push(chunk);

  const renderChunk = (entries) => `${urlsetPrefix}${entries.join('')}${urlsetSuffix}`;
  if (chunks.length === 1) {
    fs.writeFileSync(path.join(output, 'sitemap.xml'), renderChunk(chunks[0]));
    return;
  }

  const files = [];
  for (const entries of chunks) {
    const file = `sitemap-${files.length + 1}.xml`;
    fs.writeFileSync(path.join(output, file), renderChunk(entries));
    files.push(file);
  }
  const sitemapEntries = files
    .map((file) => `<sitemap><loc>${escapeHtml(`${siteUrl}/${file}`)}</loc></sitemap>`)
    .join('\n');
  fs.writeFileSync(path.join(output, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</sitemapindex>\n`);
}

function build({
  output = path.join(__dirname, 'dist'),
  siteUrl = process.env.AASAANLY_SITE_URL || 'https://aasaanly.com',
  appUrl = process.env.AASAANLY_APP_URL || 'https://m.aasaanapp.in/',
  catalogPath = path.join(root, 'backend', 'src', 'utils', 'Aasaan_Services_Master.csv'),
  locationsPath = path.join(__dirname, 'service-locations.json'),
  contentPath = path.join(__dirname, 'editorial-content.json'),
} = {}) {
  let canonicalBase;
  try {
    const parsedSiteUrl = new URL(siteUrl);
    const parsedAppUrl = new URL(appUrl);
    if (parsedSiteUrl.protocol !== 'https:' || parsedSiteUrl.username || parsedSiteUrl.password
      || parsedSiteUrl.pathname !== '/' || parsedSiteUrl.search || parsedSiteUrl.hash
      || parsedAppUrl.protocol !== 'https:' || parsedAppUrl.username || parsedAppUrl.password) {
      throw new Error();
    }
    canonicalBase = parsedSiteUrl.origin;
  } catch {
    throw new Error('Site URL must be an HTTPS origin and app URL must use HTTPS.');
  }

  const services = readServices(catalogPath);
  const cities = readLocations(locationsPath, services);
  const requirements = new Map([
    ['/', []],
    ['/services/', []],
  ]);
  for (const service of services) {
    requirements.set(`/services/${service.slug}/`, [{ type: 'service', slug: service.slug }]);
  }
  for (const city of cities) {
    requirements.set(`/services/${city.slug}/`, [{ type: 'city', slug: city.slug }]);
    for (const locality of city.localities) {
      requirements.set(`/services/${city.slug}/${locality.slug}/`, [
        { type: 'city', slug: city.slug },
        { type: 'locality', citySlug: city.slug, slug: locality.slug },
      ]);
    }
    for (const service of services) {
      requirements.set(`/services/${service.slug}/${city.slug}/`, [
        { type: 'service', slug: service.slug },
        { type: 'city', slug: city.slug },
      ]);
      for (const locality of city.localities) {
        requirements.set(`/services/${service.slug}/${city.slug}/${locality.slug}/`, [
          { type: 'service', slug: service.slug },
          { type: 'city', slug: city.slug },
          { type: 'locality', citySlug: city.slug, slug: locality.slug },
        ]);
      }
    }
  }

  const content = readContent(contentPath, services, cities, [...requirements.keys()]);
  assertApprovedRoutes(content, requirements);
  const indexableRoutes = content.approvedRoutesForIndexing;

  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(path.join(output, 'assets'), { recursive: true });
  fs.copyFileSync(path.join(__dirname, 'seo-site.css'), path.join(output, 'assets', 'seo-site.css'));

  const publishedUrls = new Set();
  function writePage(route, html, faqItems = content.faqs.items) {
    const filePath = route === '/'
      ? path.join(output, 'index.html')
      : path.join(output, ...route.split('/').filter(Boolean), 'index.html');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const pageHtml = html.replace('</main>', `${renderFaqSection(faqItems)}</main>`);
    fs.writeFileSync(filePath, pageHtml, 'utf8');
    if (indexableRoutes.has(route)) publishedUrls.add(`${canonicalBase}${route}`);
  }

  const shared = { appUrl, canonicalBase, indexableRoutes, faqItems: content.faqs.items };
  writePage('/', renderHome({ ...shared, services }));
  writePage('/services/', renderServiceDirectory({ ...shared, services, cities }));

  for (const service of services) {
    const serviceContent = content.services[service.slug];
    const serviceFaqItems = [...(serviceContent?.faqs || []), ...content.faqs.items];
    writePage(`/services/${service.slug}/`, renderServiceDescription({
      ...shared,
      service,
      editorial: serviceContent,
      cities,
      faqItems: serviceFaqItems,
    }), serviceFaqItems);
  }

  for (const city of cities) {
    const cityContent = content.locations[city.slug];
    writePage(`/services/${city.slug}/`, renderCityDirectory({
      ...shared, city, editorial: cityContent, services,
    }));

    for (const locality of city.localities) {
      writePage(`/services/${city.slug}/${locality.slug}/`, renderLocalityDirectory({
        ...shared,
        city,
        locality,
        editorial: cityContent?.localities?.[locality.slug],
        services,
      }));
    }

    for (const service of services) {
      const serviceContent = content.services[service.slug];
      const serviceFaqItems = [...(serviceContent?.faqs || []), ...content.faqs.items];
      writePage(`/services/${service.slug}/${city.slug}/`, renderServiceCity({
        ...shared,
        service,
        city,
        serviceContent,
        locationContent: cityContent,
        services,
        faqItems: serviceFaqItems,
      }), serviceFaqItems);
      for (const locality of city.localities) {
        writePage(`/services/${service.slug}/${city.slug}/${locality.slug}/`, renderServiceLocality({
          ...shared,
          service,
          city,
          locality,
          serviceContent,
          locationContent: cityContent,
          localityContent: cityContent?.localities?.[locality.slug],
          services,
          faqItems: serviceFaqItems,
        }), serviceFaqItems);
      }
    }
  }

  fs.writeFileSync(path.join(output, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${canonicalBase}/sitemap.xml\n`);
  writeSitemap(output, canonicalBase, [...publishedUrls].sort());
  fs.writeFileSync(path.join(output, '404.html'), renderNotFound(shared), 'utf8');
  console.log(`Generated ${requirements.size} pages; ${publishedUrls.size} are indexable.`);
  return { generatedCount: requirements.size, indexableCount: publishedUrls.size };
}

if (require.main === module) {
  try {
    build();
  } catch (error) {
    console.error(`SEO site build failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { assertApprovedRoutes, build, writeSitemap };
