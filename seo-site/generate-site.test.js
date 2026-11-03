const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { build, writeSitemap } = require('./generate-site');
const { chooseVariant } = require('./lib/page-templates');

const repoRoot = path.resolve(__dirname, '..');
const catalogPath = path.join(repoRoot, 'backend', 'src', 'utils', 'Aasaan_Services_Master.csv');
const locations = {
  cities: [{
    name: 'Noida',
    slug: 'noida',
    state: 'Uttar Pradesh',
    localities: [{ name: 'Sector 18', slug: 'sector-18' }],
  }],
};
const routes = [
  '/',
  '/services/',
  '/services/plumber/',
  '/services/noida/',
  '/services/noida/sector-18/',
  '/services/plumber/noida/',
  '/services/plumber/noida/sector-18/',
];
const routesForSampleApproval = [
  '/',
  '/services/',
  '/services/electrician/',
  '/services/plumber/',
  '/services/interior-designer/',
  '/services/noida/',
  '/services/noida/sector-18/',
  '/services/noida/sector-62/',
  '/services/greater-noida/',
  '/services/greater-noida/noida-extension/',
  '/services/electrician/noida/',
  '/services/electrician/noida/sector-18/',
  '/services/electrician/noida/sector-62/',
  '/services/electrician/greater-noida/',
  '/services/electrician/greater-noida/noida-extension/',
  '/services/plumber/noida/',
  '/services/plumber/noida/sector-18/',
  '/services/plumber/noida/sector-62/',
  '/services/plumber/greater-noida/',
  '/services/plumber/greater-noida/noida-extension/',
  '/services/interior-designer/noida/',
  '/services/interior-designer/noida/sector-18/',
  '/services/interior-designer/noida/sector-62/',
  '/services/interior-designer/greater-noida/',
  '/services/interior-designer/greater-noida/noida-extension/',
  '/services/jhansi/',
  '/services/jhansi/manik-chowk/',
  '/services/jhansi/elite-circle/',
  '/services/jhansi/civil-lines/',
  '/services/electrician/jhansi/',
  '/services/electrician/jhansi/manik-chowk/',
  '/services/electrician/jhansi/elite-circle/',
  '/services/electrician/jhansi/civil-lines/',
];
const content = {
  approvedRoutesForIndexing: routes,
  faqs: {
    reviewStatus: 'approved',
    items: [{
      question: 'How does the service request work?',
      answer: 'Submit service details and location in the app.',
    }],
  },
  services: {
    plumber: {
      reviewStatus: 'approved',
      description: 'A reviewed description of plumbing repair tasks, drain cleaning, pipe replacement, and general service scope for homeowners in the area.',
      locationDescriptionVariants: [
        'In {{location}}, plumbing requests can cover repairs, drain cleaning, pipe replacement, and other household plumbing work. Describe the affected fixture and what you observed.',
        'Plumbing service requests in {{location}} may involve repairs, blocked drains, pipe replacement, and related household work. Include the affected fixture and the issue you noticed.',
      ],
      tasks: ['Tap repair', 'Drain blockage', 'Pipe replacement'],
    },
  },
  locations: {
    noida: {
      reviewStatus: 'approved',
      localities: {
        'sector-18': {
          reviewStatus: 'approved',
        },
      },
    },
  },
};

test('template wording variants are deterministic and selected by route', () => {
  const variants = ['First reviewed wording.', 'Second reviewed wording.'];
  const noidaRoute = '/services/electrician/noida/';
  const noidaVariant = chooseVariant(noidaRoute, 'service-city.availability', variants);

  assert.equal(chooseVariant(noidaRoute, 'service-city.availability', variants), noidaVariant);
  assert.ok(variants.includes(noidaVariant));
  assert.notEqual(
    chooseVariant('/services/electrician/delhi/', 'service-city.availability', variants),
    noidaVariant,
  );
  assert.throws(() => chooseVariant(noidaRoute, 'availability', []), /must contain non-empty strings/);
});

function createFixture(t, fixtureContent = content) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'aasaanly-seo-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const locationsPath = path.join(directory, 'service-locations.json');
  const contentPath = path.join(directory, 'editorial-content.json');
  fs.writeFileSync(locationsPath, JSON.stringify(locations));
  fs.writeFileSync(contentPath, JSON.stringify(fixtureContent));
  const output = path.join(directory, 'dist');
  const result = build({
    output,
    siteUrl: 'https://example.test',
    appUrl: 'https://app.example.test/',
    catalogPath,
    locationsPath,
    contentPath,
  });
  return { output, result };
}

test('generates all route types and only indexes approved routes', (t) => {
  const { output, result } = createFixture(t);
  assert.ok(result.generatedCount > routes.length);
  assert.equal(result.indexableCount, routes.length);

  const paths = [
    'index.html',
    'services/index.html',
    'services/plumber/index.html',
    'services/noida/index.html',
    'services/noida/sector-18/index.html',
    'services/plumber/noida/index.html',
    'services/plumber/noida/sector-18/index.html',
  ];
  for (const relativePath of paths) {
    assert.ok(fs.existsSync(path.join(output, relativePath)), `missing ${relativePath}`);
  }
});

test('renders reviewed locality content, unique metadata, and appropriate structured data', (t) => {
  const { output } = createFixture(t);
  const file = path.join(output, 'services', 'plumber', 'noida', 'sector-18', 'index.html');
  const html = fs.readFileSync(file, 'utf8');

  assert.match(html, /<h1>Find Plumber help near Sector 18<\/h1>/);
  assert.ok(content.services.plumber.locationDescriptionVariants
    .some((variant) => html.includes(variant.replaceAll('{{location}}', 'Sector 18, Noida'))));
  assert.match(html, /Confirm your exact location near Sector 18, Noida/);
  assert.match(html, /rel="canonical" href="https:\/\/example\.test\/services\/plumber\/noida\/sector-18\/"/);
  assert.match(html, /name="robots" content="index,follow"/);

  const title = html.match(/<title>(.*?)<\/title>/)[1];
  const descriptions = [...html.matchAll(/<meta name="description" content="(.*?)">/g)];
  const h1s = [...html.matchAll(/<h1(?:\s[^>]*)?>(.*?)<\/h1>/g)];
  assert.equal(title, 'Plumber near Sector 18 | Aasaanly');
  assert.equal(descriptions.length, 1);
  assert.equal(h1s.length, 1);

  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.ok(schema['@graph'].some((entry) => entry['@type'] === 'BreadcrumbList'));
});

test('service and location pages render useful request guidance and contextual navigation', (t) => {
  const { output } = createFixture(t);
  const cityPage = fs.readFileSync(path.join(output, 'services', 'plumber', 'noida', 'index.html'), 'utf8');
  const localityPage = fs.readFileSync(
    path.join(output, 'services', 'plumber', 'noida', 'sector-18', 'index.html'),
    'utf8',
  );
  const cityLead = cityPage.match(/class="hero-lead">(.*?)<\/p>/)[1];
  const localityLead = localityPage.match(/class="hero-lead">(.*?)<\/p>/)[1];
  assert.notEqual(cityLead, localityLead);
  assert.match(cityLead, /plumbing .*requests/i);
  assert.match(cityLead, /Noida/);
  assert.match(localityLead, /plumbing .*requests/i);
  assert.match(localityLead, /Sector 18, Noida/);
  assert.ok(content.services.plumber.locationDescriptionVariants
    .some((variant) => cityLead === variant.replaceAll('{{location}}', 'Noida')));
  assert.ok(content.services.plumber.locationDescriptionVariants
    .some((variant) => localityLead === variant.replaceAll('{{location}}', 'Sector 18, Noida')));
  assert.doesNotMatch(cityLead, /\{\{location\}\}/);
  assert.doesNotMatch(localityLead, /\{\{location\}\}/);

  for (const html of [cityPage, localityPage]) {
    assert.match(html, /What do you need help with\?/);
    assert.match(html, /class="service-tasks"/);
    assert.match(html, /class="process-steps"/);
    assert.doesNotMatch(html, /What to include in your plumber request/);
    assert.doesNotMatch(html, /request-tips|Preparing your request|Safety reminder/);
    assert.match(html, /Understanding plumber costs in/);
    assert.match(html, /Provider coverage, responses, and availability can vary by location/);
    assert.match(html, /id="request"/);
    assert.match(html, /href="https:\/\/app\.example\.test\/">Find plumber help<\/a>/);
    assert.match(html, /aria-label="Aasaanly service benefits"/);
    assert.match(html, /ID-verified experts/);
    assert.match(html, /Rated by customers like you/);
    assert.match(html, /Discuss and negotiate directly/);
    assert.match(html, /Pay providers directly with no commission on service jobs/);
    assert.match(html, /Free to request a service; optional paid boosts and provider plans may cost extra/);
    assert.match(html, /href="https:\/\/app\.example\.test\/">Download app<\/a>/);
    assert.match(html, /Continue with Aasaanly/);
    assert.match(html, /<h2 id="faq-heading">Frequently asked questions<\/h2>/);
  }

  assert.match(cityPage, /Tap repair/);
  assert.match(cityPage, /Plumber by area in Noida/);
  assert.match(localityPage, /Confirm your exact location near Sector 18, Noida/);
  assert.match(localityPage, /Explore other services near Sector 18/);
});

test('service location pages render reviewed tasks and service FAQs', (t) => {
  const serviceContent = {
    ...content.services.plumber,
    faqs: [{
      question: 'What should I tell the plumber?',
      answer: 'Describe the affected fixture and the issue you noticed.',
    }],
  };
  const { output } = createFixture(t, {
    ...content,
    services: { plumber: serviceContent },
  });
  const html = fs.readFileSync(
    path.join(output, 'services', 'plumber', 'noida', 'index.html'),
    'utf8',
  );

  assert.match(html, /plumbing requests can cover repairs, drain cleaning, pipe replacement/i);
  assert.match(html, /class="trust-line"/);
  assert.match(html, /href="https:\/\/app\.example\.test\/">Find plumber help<\/a>/);
  assert.match(html, /<strong>Tap repair<\/strong>/);
  assert.doesNotMatch(html, /Name the fixture and describe the repair needed/);
  assert.doesNotMatch(html, /Safety reminder|damaged equipment/);
  assert.match(html, /There is no single price for every job/);
  assert.match(html, /What should I tell the plumber\?/);

  const servicePages = [
    'services/plumber/index.html',
    'services/plumber/noida/index.html',
    'services/plumber/noida/sector-18/index.html',
  ];
  for (const relativePath of servicePages) {
    const page = fs.readFileSync(path.join(output, relativePath), 'utf8');
    const serviceFaqIndex = page.indexOf('<dt>What should I tell the plumber?</dt>');
    const commonFaqIndex = page.indexOf('<dt>How does the service request work?</dt>');
    assert.ok(serviceFaqIndex >= 0 && serviceFaqIndex < commonFaqIndex, relativePath);

    const schema = JSON.parse(page.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    const faqSchema = schema['@graph'].find((entry) => entry['@type'] === 'FAQPage');
    assert.deepEqual(
      faqSchema.mainEntity.slice(0, 2).map((item) => item.name),
      ['What should I tell the plumber?', 'How does the service request work?'],
      relativePath,
    );
  }
});

test('renders escaped shared FAQs on every route and requires review before indexing', (t) => {
  const faqContent = {
    ...content,
    faqs: {
      reviewStatus: 'approved',
      items: [{
        question: 'How does the service request work?',
        answer: 'Submit a request for <script>help</script> in the app.',
      }],
    },
  };
  const { output } = createFixture(t, faqContent);
  const pageFiles = [];
  const collect = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) collect(file);
      else if (entry.name === 'index.html') pageFiles.push(file);
    }
  };
  collect(output);
  for (const file of pageFiles) {
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, /<h2 id="faq-heading">Frequently asked questions<\/h2>/);
    assert.match(html, /Submit a request for &lt;script&gt;help&lt;\/script&gt; in the app\./);
    assert.doesNotMatch(html, /<dd>Submit a request for <script>/);
  }

  const unreviewedFaqs = {
    ...content,
    approvedRoutesForIndexing: ['/', '/services/'],
    faqs: { ...content.faqs, reviewStatus: 'draft' },
  };
  assert.throws(() => createFixture(t, unreviewedFaqs),
    /required content and shared FAQs are reviewed/);
});

test('all generated pages have unique titles, canonicals, and one primary heading', (t) => {
  const { output, result } = createFixture(t);
  const titles = new Set();
  const descriptions = new Set();
  const canonicals = new Set();
  const sitemapUrls = new Set();
  const expectedUrls = new Set(routes.map((route) => `https://example.test${route}`));
  let htmlCount = 0;
  for (const [, url] of fs.readFileSync(path.join(output, 'sitemap.xml'), 'utf8').matchAll(/<loc>(.*?)<\/loc>/g)) {
    sitemapUrls.add(url);
  }
  assert.deepEqual(sitemapUrls, expectedUrls);

  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(file);
      } else if (entry.name === 'index.html') {
        htmlCount += 1;
        const html = fs.readFileSync(file, 'utf8');
        const title = html.match(/<title>(.*?)<\/title>/)?.[1];
        const description = html.match(/<meta name="description" content="(.*?)">/)?.[1];
        const canonical = html.match(/<link rel="canonical" href="(.*?)">/)?.[1];
        const relativeRoute = path.relative(output, file).replace(/\\/g, '/');
        const route = relativeRoute === 'index.html'
          ? '/'
          : `/${relativeRoute.replace(/\/index\.html$/, '/')}`;
        assert.ok(title, `missing title in ${path.relative(output, file)}`);
        assert.ok(description, `missing description in ${path.relative(output, file)}`);
        assert.ok(canonical, `missing canonical in ${path.relative(output, file)}`);
        assert.ok(description.length <= 155, `description exceeds 155 characters in ${path.relative(output, file)}`);
        assert.equal(canonical, `https://example.test${route}`);
        assert.equal(titles.has(title), false, `duplicate title: ${title}`);
        assert.equal(descriptions.has(description), false, `duplicate description: ${description}`);
        assert.equal(canonicals.has(canonical), false, `duplicate canonical: ${canonical}`);
        titles.add(title);
        descriptions.add(description);
        canonicals.add(canonical);
        assert.equal([...html.matchAll(/<h1(?:\s[^>]*)?>/g)].length, 1, `expected one H1 in ${path.relative(output, file)}`);
        const expectedRobots = routes.includes(route) ? 'index,follow' : 'noindex,follow';
        assert.match(html, new RegExp(`<meta name="robots" content="${expectedRobots}">`));
        const schema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
        assert.ok(schema['@graph'].some((entry) => entry['@type'] === 'BreadcrumbList'));
      }
    }
  };
  visit(output);
  assert.equal(htmlCount, result.generatedCount);
  const css = fs.readFileSync(path.join(output, 'assets', 'seo-site.css'), 'utf8');
  assert.match(css, /@media \(max-width: 38rem\)/);
  assert.match(css, /\.hero\s*\{[^}]*max-width:\s*70rem;/s);
  assert.match(fs.readFileSync(path.join(output, 'services', 'index.html'), 'utf8'), /name="viewport"/);
});

test('excludes draft routes from sitemap and indexable links while still generating them', (t) => {
  const draftContent = {
    ...content,
    approvedRoutesForIndexing: ['/', '/services/'],
    services: {
      plumber: { reviewStatus: 'draft' },
    },
    locations: {
      noida: {
        reviewStatus: 'draft',
        localities: { 'sector-18': { reviewStatus: 'draft' } },
      },
    },
  };
  const { output, result } = createFixture(t, draftContent);
  assert.ok(result.generatedCount > routes.length);
  assert.equal(result.indexableCount, 2);

  const draftPage = fs.readFileSync(path.join(output, 'services', 'plumber', 'index.html'), 'utf8');
  assert.match(draftPage, /name="robots" content="noindex,follow"/);
  const sitemap = fs.readFileSync(path.join(output, 'sitemap.xml'), 'utf8');
  assert.match(sitemap, /https:\/\/example\.test\/services\//);
  assert.doesNotMatch(sitemap, /\/services\/plumber\//);

  const directoryPage = fs.readFileSync(path.join(output, 'services', 'index.html'), 'utf8');
  assert.doesNotMatch(directoryPage, /<a href="\/services\/plumber\/">/);
});

test('draft editorial content produces no indexable page or sitemap entry', (t) => {
  const contentData = JSON.parse(fs.readFileSync(path.join(__dirname, 'editorial-content.json'), 'utf8'));
  const draftContent = {
    ...contentData,
    approvedRoutesForIndexing: [],
    faqs: { ...contentData.faqs, reviewStatus: 'draft' },
    services: {
      electrician: { ...contentData.services.electrician, reviewStatus: 'draft' },
    },
    locations: {
      noida: {
        ...contentData.locations.noida,
        reviewStatus: 'draft',
        localities: {
          'sector-18': {
            ...contentData.locations.noida.localities['sector-18'],
            reviewStatus: 'draft',
          },
        },
      },
    },
  };
  const { output } = createFixture(t, draftContent);
  const draftHtml = fs.readFileSync(path.join(output, 'services', 'electrician', 'index.html'), 'utf8');
  assert.match(draftHtml, /name="robots" content="noindex,follow"/);
  assert.doesNotMatch(fs.readFileSync(path.join(output, 'sitemap.xml'), 'utf8'), /<loc>/);
});

test('approved sample pages link to each other and appear in the sitemap', (t) => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'aasaanly-seo-approved-samples-'));
  t.after(() => fs.rmSync(output, { recursive: true, force: true }));
  build({
    output,
    siteUrl: 'https://example.test',
    appUrl: 'https://app.example.test/',
  });
  const contentData = JSON.parse(fs.readFileSync(path.join(__dirname, 'editorial-content.json'), 'utf8'));
  const locationData = JSON.parse(fs.readFileSync(path.join(__dirname, 'service-locations.json'), 'utf8'));
  assert.equal(contentData.faqs.reviewStatus, 'approved');
  assert.deepEqual(contentData.approvedRoutesForIndexing, routesForSampleApproval);
  assert.equal(locationData.cities.filter((city) => city.slug !== 'jhansi').length, 20);
  const expectedCities = [
    'noida', 'greater-noida', 'delhi', 'mumbai', 'bengaluru', 'hyderabad',
    'chennai', 'kolkata', 'pune', 'ahmedabad', 'jaipur', 'lucknow', 'surat',
    'indore', 'bhopal', 'nagpur', 'kochi', 'coimbatore', 'chandigarh', 'patna',
  ];
  for (const slug of expectedCities) {
    assert.ok(locationData.cities.some((city) => city.slug === slug), `missing target city ${slug}`);
  }

  const directory = fs.readFileSync(path.join(output, 'services', 'index.html'), 'utf8');
  assert.match(directory, /<a href="\/services\/electrician\/">Electrician<\/a>/);
  assert.match(directory, /<a href="\/services\/plumber\/">Plumber<\/a>/);
  assert.match(directory, /<a href="\/services\/interior-designer\/">Interior Designer<\/a>/);
  const servicePage = fs.readFileSync(path.join(output, 'services', 'electrician', 'index.html'), 'utf8');
  assert.match(servicePage, /<a href="\/services\/electrician\/noida\/">Noida<\/a>/);
  const city = fs.readFileSync(path.join(output, 'services', 'noida', 'index.html'), 'utf8');
  assert.match(city, /<a href="\/services\/noida\/sector-18\/">Sector 18<\/a>/);
  assert.match(city, /<a href="\/services\/noida\/sector-62\/">Sector 62<\/a>/);
  const greaterNoida = fs.readFileSync(path.join(output, 'services', 'greater-noida', 'index.html'), 'utf8');
  assert.match(greaterNoida, /<a href="\/services\/greater-noida\/noida-extension\/">Noida Extension<\/a>/);
  const delhi = fs.readFileSync(path.join(output, 'services', 'delhi', 'index.html'), 'utf8');
  assert.match(delhi, /name="robots" content="noindex,follow"/);

  const sitemap = fs.readFileSync(path.join(output, 'sitemap.xml'), 'utf8');
  assert.match(sitemap, /\/services\/electrician\/noida\/sector-18\//);
  assert.match(sitemap, /\/services\/plumber\/greater-noida\/noida-extension\//);
  assert.match(sitemap, /\/services\/interior-designer\/noida\/sector-62\//);
});

test('Jhansi and configured localities generate approved, interlinked electrician pages', (t) => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'aasaanly-seo-jhansi-'));
  t.after(() => fs.rmSync(output, { recursive: true, force: true }));
  const result = build({
    output,
    siteUrl: 'https://example.test',
    appUrl: 'https://app.example.test/',
  });
  assert.equal(result.indexableCount, 33);

  const services = fs.readFileSync(path.join(output, 'services', 'index.html'), 'utf8');
  assert.match(services, /<a href="\/services\/jhansi\/">Jhansi<\/a>/);
  const city = fs.readFileSync(path.join(output, 'services', 'jhansi', 'index.html'), 'utf8');
  assert.match(city, /<a href="\/services\/electrician\/jhansi\/">Electrician<\/a>/);
  for (const locality of ['manik-chowk', 'elite-circle', 'civil-lines']) {
    const localityDirectory = fs.readFileSync(
      path.join(output, 'services', 'jhansi', locality, 'index.html'),
      'utf8',
    );
    const serviceLocality = fs.readFileSync(
      path.join(output, 'services', 'electrician', 'jhansi', locality, 'index.html'),
      'utf8',
    );
    assert.match(city, new RegExp(`<a href="/services/jhansi/${locality}/">`));
    assert.match(localityDirectory, new RegExp(`<a href="/services/electrician/jhansi/${locality}/">`));
    assert.match(serviceLocality, /name="robots" content="index,follow"/);
  }
});

test('requires complete approved content and valid approved routes', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'aasaanly-seo-invalid-'));
  try {
    const locationsPath = path.join(temporary, 'service-locations.json');
    const contentPath = path.join(temporary, 'editorial-content.json');
    fs.writeFileSync(locationsPath, JSON.stringify(locations));
    fs.writeFileSync(contentPath, JSON.stringify({
      approvedRoutesForIndexing: [...routes, '/services/electrician/'],
      faqs: content.faqs,
      services: content.services,
      locations: content.locations,
    }));
    assert.throws(() => build({
      output: path.join(temporary, 'dist'),
      siteUrl: 'https://example.test',
      appUrl: 'https://app.example.test/',
      catalogPath,
      locationsPath,
      contentPath,
    }), /cannot be approved until its required content and shared FAQs are reviewed/);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }

  const malformed = {
    ...content,
    services: { plumber: { reviewStatus: 'approved', description: 'Only a description.' } },
  };
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aasaanly-seo-malformed-'));
  try {
    const locationsPath = path.join(tempDir, 'service-locations.json');
    const contentPath = path.join(tempDir, 'editorial-content.json');
    fs.writeFileSync(locationsPath, JSON.stringify(locations));
    fs.writeFileSync(contentPath, JSON.stringify(malformed));
    assert.throws(() => build({
      output: path.join(tempDir, 'dist'),
      siteUrl: 'https://example.test',
      appUrl: 'https://app.example.test/',
      catalogPath,
      locationsPath,
      contentPath,
    }), /requires tasks/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  const missingDescriptionContent = {
    ...content,
    services: {
      plumber: {
        ...content.services.plumber,
        overview: content.services.plumber.description,
        description: undefined,
      },
    },
  };
  const missingDescriptionTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'aasaanly-seo-missing-description-'));
  try {
    const locationsPath = path.join(missingDescriptionTemp, 'service-locations.json');
    const contentPath = path.join(missingDescriptionTemp, 'editorial-content.json');
    fs.writeFileSync(locationsPath, JSON.stringify(locations));
    fs.writeFileSync(contentPath, JSON.stringify(missingDescriptionContent));
    assert.throws(() => build({
      output: path.join(missingDescriptionTemp, 'dist'),
      siteUrl: 'https://example.test',
      appUrl: 'https://app.example.test/',
      catalogPath,
      locationsPath,
      contentPath,
    }), /requires description/);
  } finally {
    fs.rmSync(missingDescriptionTemp, { recursive: true, force: true });
  }
});

test('rejects generic or duplicate approved descriptions without arbitrary content thresholds', (t) => {
  const shortDescriptionContent = {
    ...content,
    services: {
      plumber: {
        ...content.services.plumber,
        description: 'Short but useful.',
        tasks: ['Tap repair'],
      },
    },
  };
  assert.doesNotThrow(() => createFixture(t, shortDescriptionContent));

  const genericDescriptionContent = {
    ...content,
    services: {
      plumber: {
        ...content.services.plumber,
        description: 'Review common plumbing tasks for a home service request.',
      },
    },
  };
  assert.throws(() => createFixture(t, genericDescriptionContent), /generic fallback text/);

  const duplicateDescriptionContent = {
    ...content,
    services: {
      ...content.services,
      electrician: { ...content.services.plumber },
    },
  };
  assert.throws(() => createFixture(t, duplicateDescriptionContent), /duplicates another entry's description/);

  const missingLocationPlaceholder = {
    ...content,
    services: {
      plumber: {
        ...content.services.plumber,
        locationDescriptionVariants: ['Plumbing requests in the area can cover common household work.'],
      },
    },
  };
  assert.throws(() => createFixture(t, missingLocationPlaceholder), /exactly one \{\{location\}\} placeholder/);

  const missingLocationVariants = {
    ...content,
    services: {
      plumber: {
        ...content.services.plumber,
        locationDescriptionVariants: undefined,
      },
    },
  };
  assert.throws(() => createFixture(t, missingLocationVariants), /requires locationDescriptionVariants/);

});

test('escapes editorial text and keeps 404 pages noindex', (t) => {
  const escapedContent = {
    ...content,
    services: {
      plumber: {
        ...content.services.plumber,
        description: '<script>alert("x")</script> A reviewed description of plumbing repair tasks, drain cleaning, and general service scope for homeowners.',
      },
    },
  };
  const { output } = createFixture(t, escapedContent);
  const servicePage = fs.readFileSync(path.join(output, 'services', 'plumber', 'index.html'), 'utf8');
  assert.match(servicePage, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
  assert.doesNotMatch(servicePage, /<script>alert/);

  const notFound = fs.readFileSync(path.join(output, '404.html'), 'utf8');
  assert.match(notFound, /name="robots" content="noindex,follow"/);
});

test('writes a sitemap index when URL count exceeds the protocol limit', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'aasaanly-seo-sitemap-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const urls = Array.from({ length: 50001 }, (_, index) => `https://example.test/page-${index}/`);
  writeSitemap(directory, 'https://example.test', urls);
  const sitemapIndex = fs.readFileSync(path.join(directory, 'sitemap.xml'), 'utf8');
  assert.match(sitemapIndex, /sitemap-1\.xml/);
  assert.match(sitemapIndex, /sitemap-2\.xml/);
});

test('all generated internal links resolve', (t) => {
  const { output } = createFixture(t);
  const htmlFiles = [];
  const collect = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) collect(file);
      else if (entry.name.endsWith('.html')) htmlFiles.push(file);
    }
  };
  collect(output);
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    for (const [, href] of html.matchAll(/href="(\/[^"#?]*)"/g)) {
      const target = path.join(output, href.replace(/^\/+/, ''));
      assert.ok(fs.existsSync(target) || fs.existsSync(path.join(target, 'index.html')), `${path.relative(output, file)} links to missing ${href}`);
    }
  }
});

test('indexable pages do not link to generated but noindex pages', (t) => {
  const { output } = createFixture(t);
  const approved = new Set(routes);
  const inspect = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        inspect(file);
      } else if (entry.name === 'index.html') {
        const html = fs.readFileSync(file, 'utf8');
        if (!html.includes('name="robots" content="index,follow"')) continue;
        for (const [, href] of html.matchAll(/href="(\/[^"#?]*)"/g)) {
          if (href.startsWith('/assets/')) continue;
          assert.ok(approved.has(href), `${path.relative(output, file)} links to non-indexable route ${href}`);
        }
      }
    }
  };
  inspect(output);
});
