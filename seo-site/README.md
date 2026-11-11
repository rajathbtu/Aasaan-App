# Aasaanly SEO site

The SEO site is a static, responsive website, separate from the Expo app
runtime but kept in this repository. Node.js builds complete HTML pages from
the backend service catalog, a maintained location registry, and reviewed
editorial content. Crawlers and browsers receive the content and links in the
initial HTML; no client-side JavaScript is needed to render pages.

All configured service/location routes are generated regardless of provider
availability. **Generation does not mean a page is ready for search indexing:**
only reviewed routes are indexable or included in the sitemap.

## Build, test, and preview

From the repository root:

```powershell
Set-Location seo-site
npm test
npm run build
```

`npm test` builds into `dist/` and runs the checks. `npm run build` only builds.
The generator uses Node.js built-ins and requires no site-specific dependencies.
Build artifacts in `dist/` are ignored by Git.
Inter is served as a locally hosted, Latin-subset variable WOFF2 font; its
SIL Open Font License is included alongside the generated font asset.

To preview the generated site locally:

```powershell
npm run build
Set-Location dist
py -m http.server 8000
```

Open `http://localhost:8000/`. Stop the local server with Ctrl+C.

The GitHub Actions workflow at `.github/workflows/seo-site.yml` runs `npm test`
on pushes and pull requests. It validates the build but does not deploy it.

## Generated routes

- `/` — site homepage.
- `/services/` — service directory.
- `/services/{service}/` — service overview.
- `/services/{city}/` — city service directory.
- `/services/{city}/{locality}/` — locality service directory.
- `/services/{service}/{city}/` — service and city.
- `/services/{service}/{city}/{locality}/` — service and locality.

Service data comes from `backend/src/utils/Aasaan_Services_Master.csv`.
Service IDs become URL slugs (for example, `interior_designer` becomes
`interior-designer`). Cities and localities come from
`service-locations.json`. The registry includes Noida and Greater Noida
(Sector 18, Sector 62, and Noida Extension), 20 target metro and Tier 1/2
cities, and the existing Jhansi localities.

The build produces URL-matched directories, for example:

```text
/services/plumber/noida/sector-18/
  -> dist/services/plumber/noida/sector-18/index.html
```

City slugs must not collide with service slugs because both use
`/services/{slug}/`. Slugs must be lowercase, hyphen-separated, and unique
within their level.

## Editorial review and indexability

`editorial-content.json` controls both editorial readiness and which routes are allowed
to be indexed. The current sample approves electrician page clusters in
Noida and Jhansi, the shared FAQ content, and the directory routes needed to navigate
between them. These sample approvals make those routes indexable and place
them in the sitemap; review the final copy and URLs before deploying. Other
generated pages receive
`<meta name="robots" content="noindex,follow">` and are excluded from
`sitemap.xml` and indexable internal navigation. `robots.txt` allows crawling
so search engines can see the `noindex` directive.

The file includes reviewed electrician, plumber, and interior designer
content for Noida and Greater Noida. The remaining target city pages are
generated but kept non-indexable until their editorial content is reviewed
and their exact routes are added to `approvedRoutesForIndexing`.

The top-level `faqs` entry contains shared questions and answers displayed on
every generated page. Add, remove, or edit FAQ items there using non-empty
`question` and `answer` strings. Keep the FAQ set in `draft` while it is being
checked; every route approval requires the shared FAQs to be approved too.
The included examples cover how requests work, pricing, and arrival timing.
They avoid promising a fixed price, provider response, or arrival time; verify
their wording against current product behavior before live deployment.

FAQ questions and answers can use `{{service}}`, `{{location}}`, `{{city}}`,
and `{{locality}}`. These are filled from the page being generated; `location`
is the locality and city together when available. On pages without a service or
location context, the defaults are `service` and `your area`. Unknown
placeholders cause the build to fail.

```json
{
  "faqs": {
    "reviewStatus": "draft",
    "items": [
      {
        "question": "How do I request {{service}} help in {{location}}?",
        "answer": "Choose {{service}}, describe the work, and enter {{location}} as the service location."
      }
    ]
  }
}
```

To prepare service content, add an entry keyed by its service slug:

```json
{
  "reviewStatus": "draft",
  "description": "",
  "locationDescriptionVariants": [
    "In {{location}}, describe the service work and what you observed."
  ],
  "tasks": []
}
```

`description` is used on the service page. For service-and-location pages,
write complete reviewed sentences in `locationDescriptionVariants`; each
variant must contain exactly one `{{location}}` placeholder. The generator
selects one deterministically for each route and substitutes the city or
locality name without rewriting or splitting the sentences.

To prepare city and locality content, add an entry keyed by city slug:

```json
{
  "reviewStatus": "draft",
  "localities": {
    "locality-slug": {
      "reviewStatus": "draft"
    }
  }
}
```

Set an entry's `reviewStatus` to `approved` only after a human has checked the
generated pages. Approved services require a non-empty `description`, `tasks`,
and `locationDescriptionVariants`. City and locality entries only need a review
status. There is no arbitrary word-count rule: approval is based on accuracy,
usefulness, and whether the content genuinely helps users.

Optional service-specific `faqs` are shown on that service's pages alongside
the shared FAQ list. Keep answers accurate, conservative, and specific to the
service.

After the editorial entries are approved, review the **rendered page** for
each route you want indexed. Add its exact canonical path to
`approvedRoutesForIndexing`,
for example:

```json
{
  "approvedRoutesForIndexing": [
    "/",
    "/services/",
    "/services/plumber/",
    "/services/noida/",
    "/services/plumber/noida/",
    "/services/plumber/noida/sector-18/"
  ]
}
```

A service-city page requires approved service and city content. A
service-locality page requires approved service, city, and locality content.
The build fails if an approved route is unknown or its required content is
not approved and complete. Add only routes whose final combined content has
been reviewed; shared service/location copy alone may not make every
combination distinct enough to be useful.

Never invent provider presence, coverage, counts, prices, reviews, guarantees,
landmarks, or other local facts. Availability is deliberately not a generation
or indexing prerequisite. Pages state that provider responses can vary and
that a request does not guarantee a match.

## Page layout and technical SEO

Templates are separated by responsibility:

- `generate-site.js` loads data, validates approved routes, generates every URL, and
  writes crawl files.
- `lib/data-loader.js` reads the service CSV and validates locations and editorial
  content.
- `lib/page-templates.js` re-exports the page renderers and shared FAQ/template
  helpers.
- `lib/templates/` keeps each page type in its own JavaScript module, including
  the homepage, directories, service description, service-city, service-locality,
  and not-found pages. `shared.js` contains the common document shell, reusable
  sections, escaping, and route-based variant selection.
- `lib/utils.js` contains shared utility functions, including HTML escaping.
- `seo-site.css` provides the shared mobile-first responsive design.

Edit page structure and reusable fixed copy in the corresponding module under
`lib/templates/`. Service descriptions, task lists, request tips, and location
facts remain manually authored in `editorial-content.json` or their existing
catalogs. Do not copy route-specific facts into templates or automatically
rewrite approved editorial text.

Template modules may use `chooseVariant(route, key, variants)` for reviewed,
meaning-preserving wording alternatives. Keep each variant set semantically
equivalent and preserve qualifications about provider availability, pricing,
timing, and outcomes. Selection is deterministic for the same route and key,
so builds do not change a page unpredictably. Wording alternatives improve
copy flexibility but do not by themselves make a page useful enough to index;
continue to review the finished page and approve its route explicitly.

Service-city and service-locality pages use a focused service landing-page
structure: a location-specific introduction, supported task types, request
steps, preparation tips, practical cost questions, local navigation, a
service-request call to action, shared trust points, an app download link, and
the shared FAQs. Trust-point wording is shared between city and locality pages;
verify claims about expert ID checks, customer ratings, direct payments,
commission, and optional paid plans against current product policy before
publishing. The pricing point distinguishes free service requests from optional
paid boosts and provider plans. Task and preparation content comes from
reviewed service copy when available; otherwise the page uses the service
catalog and neutral request guidance. Service and location copy comes from the
service description, varied deterministically by route and contextualized with
the city or locality. The pages do not imply that a provider is present or
guarantee a response, price, or appointment.

Each HTML page has a unique route title and description, a canonical URL,
Open Graph metadata, one primary H1, semantic sections, accessible navigation,
and crawlable links. JSON-LD contains only WebPage and BreadcrumbList data
that matches the page, plus FAQPage data matching the visible shared and
service-specific FAQ sections. FAQ markup does not guarantee rich results.
No provider, LocalBusiness, rating, or price structured data is invented. The
generated `404.html` is marked `noindex`;
configure the host to return an actual HTTP 404 for missing pages.

The XML sitemap is derived from the same approved routes as the robots meta
directives and indexable links. It contains only canonical, reviewed URLs and
is split when the protocol limits require it. No `lastmod` values are emitted
because the build has no reliable content-modification timestamps.

Canonical URLs use `https://aasaanly.com`. Set `AASAANLY_SITE_URL` at build
time to use a different HTTPS origin for a preview, and `AASAANLY_APP_URL` to
change the app CTA destination. Preview builds must not accidentally be
published with production canonicals.

## Production launch checklist

The build is host-agnostic. Publish the contents of `dist/` at the site root
on a static host of your choice. Before launch:

1. Complete and review page content; approve only the final routes in
   `editorial-content.json`.
2. Run `npm test`, then inspect representative approved and noindex pages in
   the generated output. Verify the approved sitemap exactly matches the
   intended canonical URLs.
3. Configure the host to serve directory `index.html` files, static assets,
   and a real HTTP 404 response for missing URLs. Do not rewrite unknown
   routes to a successful homepage response.
4. Configure HTTPS and `aasaanly.com` as the canonical host. Redirect each
   `aasaanly.in` URL permanently to the matching `.com` URL; do not serve
   separate copies on both domains.
5. Verify the canonical domain in Google Search Console, submit
   `https://aasaanly.com/sitemap.xml`, and inspect representative URLs after
   deployment. Check live status codes, rendered HTML, canonical tags, robots
   directives, and redirect destinations.

DNS, domain ownership verification, redirects, Search Console, and the actual
live-host configuration require access to the relevant provider accounts and
are not performed by the build or CI workflow.

## Search guidance

The implementation follows official search-engine guidance for crawlable
static HTML, descriptive metadata, canonical URLs, sitemaps, and avoiding
thin/doorway-style location pages:

- [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Spam policies](https://developers.google.com/search/docs/essentials/spam-policies)
- [Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)

Technical readiness and editorial quality improve eligibility and usability,
but no implementation can guarantee indexing, rankings, or appearance for a
specific query.
