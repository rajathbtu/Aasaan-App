const fs = require('node:fs');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell.trim());
    if (row.some(Boolean)) rows.push(row);
  }
  return rows;
}

function slug(value) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function readServices(filePath) {
  const [headers, ...rows] = parseCsv(fs.readFileSync(filePath, 'utf8'));
  if (!headers) throw new Error('The service master CSV is empty.');

  const services = rows.map((row) => {
    const values = Object.fromEntries(headers.map((header, i) => [header, row[i] || '']));
    return {
      id: values.Service_id,
      name: values.Service_name,
      category: values.Category_name,
      slug: slug(values.Service_id),
      tags: (values.Tags || '').split(',').map((tag) => tag.trim()).filter(Boolean),
    };
  });

  if (!services.length || services.some((service) => !service.id || !service.name || !service.slug)) {
    throw new Error('The service master CSV contains no valid services.');
  }
  if (new Set(services.map((service) => service.slug)).size !== services.length) {
    throw new Error('The service master CSV contains duplicate service URL slugs.');
  }
  return services;
}

function validateLocation(location, label) {
  if (!location || typeof location !== 'object'
    || !location.name
    || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(location.slug || '')) {
    throw new Error(`${label} needs a name and a normalized URL slug.`);
  }
}

function readLocations(filePath, services) {
  const { cities } = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(cities)) throw new Error('service-locations.json must contain a cities array.');

  const serviceSlugs = new Set(services.map((service) => service.slug));
  const citySlugs = new Set();
  for (const city of cities) {
    validateLocation(city, 'Each city');
    if (!city.state || !Array.isArray(city.localities)) {
      throw new Error(`City ${city.name} needs a state and a localities array.`);
    }
    if (citySlugs.has(city.slug)) throw new Error(`Duplicate city slug: ${city.slug}`);
    citySlugs.add(city.slug);
    if (serviceSlugs.has(city.slug)) throw new Error(`City slug conflicts with a service slug: ${city.slug}`);

    const localitySlugs = new Set();
    for (const locality of city.localities) {
      validateLocation(locality, `Each locality in ${city.name}`);
      if (localitySlugs.has(locality.slug)) {
        throw new Error(`Duplicate locality slug in ${city.name}: ${locality.slug}`);
      }
      localitySlugs.add(locality.slug);
    }
  }
  return cities;
}

function readContent(filePath, services, cities, routes) {
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(content.approvedRoutesForIndexing)
    || !content.services || typeof content.services !== 'object' || Array.isArray(content.services)
    || !content.locations || typeof content.locations !== 'object' || Array.isArray(content.locations)
    || !content.faqs || typeof content.faqs !== 'object' || Array.isArray(content.faqs)
    || !Array.isArray(content.faqs.items)) {
    throw new Error('editorial-content.json must contain approvedRoutesForIndexing, faqs, services, and locations.');
  }
  if (!['draft', 'approved'].includes(content.faqs.reviewStatus)) {
    throw new Error('Shared FAQs must have reviewStatus "draft" or "approved".');
  }
  if (content.faqs.reviewStatus === 'approved' && content.faqs.items.length === 0) {
    throw new Error('Approved shared FAQs require at least one question and answer.');
  }
  if (content.faqs.items.some((item) => !item || typeof item.question !== 'string'
    || !item.question.trim() || typeof item.answer !== 'string' || !item.answer.trim()
    || (item.priority !== undefined && (!Number.isInteger(item.priority) || item.priority < 0 || item.priority > 2)))) {
    throw new Error('Each FAQ must have a non-empty question and answer, and priority must be an integer from 0 to 2 when provided.');
  }

  const routeSet = new Set(routes);
  if (content.approvedRoutesForIndexing.some((route) => typeof route !== 'string')) {
    throw new Error('Approved routes must be strings.');
  }
  const approvedRoutesForIndexing = new Set(content.approvedRoutesForIndexing);
  if (approvedRoutesForIndexing.size !== content.approvedRoutesForIndexing.length) {
    throw new Error('editorial-content.json contains duplicate approved routes.');
  }
  for (const route of approvedRoutesForIndexing) {
    if (typeof route !== 'string') throw new Error('Approved routes must be strings.');
    if (!routeSet.has(route)) throw new Error(`editorial-content.json approves an unknown route: ${route}`);
  }

  const serviceSlugs = new Set(services.map((service) => service.slug));
  const allApprovedDescriptions = [];
  for (const [serviceSlug, entry] of Object.entries(content.services)) {
    if (!serviceSlugs.has(serviceSlug)) throw new Error(`editorial-content.json references unknown service: ${serviceSlug}`);
    validateEditorialEntry(entry, `Service ${serviceSlug}`, [
      'description',
      'tasks',
      'locationDescriptionVariants',
    ], allApprovedDescriptions);
  }

  const cityMap = new Map(cities.map((city) => [city.slug, city]));
  for (const [citySlug, entry] of Object.entries(content.locations)) {
    const city = cityMap.get(citySlug);
    if (!city) throw new Error(`editorial-content.json references unknown city: ${citySlug}`);
    validateEditorialEntry(entry, `City ${citySlug}`, []);
    if (!entry.localities || typeof entry.localities !== 'object') {
      throw new Error(`City ${citySlug} content needs a localities object.`);
    }
    const localitySlugs = new Set(city.localities.map((locality) => locality.slug));
    for (const [localitySlug, localityEntry] of Object.entries(entry.localities)) {
      if (!localitySlugs.has(localitySlug)) {
        throw new Error(`editorial-content.json references unknown locality: ${citySlug}/${localitySlug}`);
      }
      validateEditorialEntry(localityEntry, `Locality ${citySlug}/${localitySlug}`, []);
    }
  }
  return { ...content, approvedRoutesForIndexing };
}

const GENERIC_FALLBACK_PATTERNS = [
  /review common/i,
  /explore service information/i,
  /browse service categories/i,
  /provider availability varies/i,
];

function containsGenericFallback(text) {
  return GENERIC_FALLBACK_PATTERNS.some((pattern) => pattern.test(text));
}

function validateEditorialEntry(entry, label, requiredFields, allApprovedDescriptions = []) {
  if (!entry || !['draft', 'approved'].includes(entry.reviewStatus)) {
    throw new Error(`${label} content must have reviewStatus "draft" or "approved".`);
  }
  if (entry.reviewStatus !== 'approved') return;

  for (const field of requiredFields) {
    const value = entry[field];
    const valid = Array.isArray(value)
      ? value.length > 0 && value.every((item) => typeof item === 'string' && item.trim().length > 0)
      : typeof value === 'string' && value.trim().length > 0;
    if (!valid) throw new Error(`${label} approved content requires ${field}.`);
  }

  if (entry.locationDescriptionVariants !== undefined) {
    const variants = entry.locationDescriptionVariants;
    if (!Array.isArray(variants)
      || variants.some((variant) => typeof variant !== 'string'
        || !variant.trim()
        || (variant.match(/\{\{location\}\}/g) || []).length !== 1)
      || new Set(variants.map((variant) => variant.trim())).size !== variants.length) {
      throw new Error(`${label} locationDescriptionVariants must contain unique, non-empty sentences with exactly one {{location}} placeholder.`);
    }
  }
  if (entry.faqs !== undefined
    && (!Array.isArray(entry.faqs)
      || entry.faqs.some((item) => !item
        || typeof item.question !== 'string' || !item.question.trim()
        || typeof item.answer !== 'string' || !item.answer.trim()
        || (item.priority !== undefined && (!Number.isInteger(item.priority) || item.priority < 0 || item.priority > 2))))) {
    throw new Error(`${label} FAQs must have non-empty question and answer strings and valid priority values from 0 to 2 when provided.`);
  }

  const description = entry.description;
  if (typeof description === 'string') {
    const normalizedDescription = description.trim().replace(/\s+/g, ' ').toLowerCase();
    if (containsGenericFallback(description)) {
      throw new Error(`${label} approved description must not use generic fallback text.`);
    }
    if (allApprovedDescriptions.includes(normalizedDescription)) {
      throw new Error(`${label} approved description duplicates another entry's description. Each page needs unique content.`);
    }
    allApprovedDescriptions.push(normalizedDescription);
  }
}

module.exports = { readContent, readLocations, readServices, slug };
