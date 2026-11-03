import type { ComponentProps } from 'react';
import SvgIcon from '../assets/icons';

type SvgIconName = ComponentProps<typeof SvgIcon>['name'];

/**
 * Resolve a service (or work-request) name into one of the approved
 * service-selection SVG icons (`ss-*`), so request cards, the success
 * screen and the boost screen all show the correct category artwork
 * instead of a hardcoded AC illustration.
 *
 * Keyword matching mirrors the catalogue mapping used on
 * SPSelectServicesScreen; unknown names fall back to a neutral tool icon.
 */
const KEYWORD_RULES: Array<{ test: RegExp; icon: SvgIconName }> = [
  { test: /air\s*condition|\bac\b/i, icon: 'ss-ac' },
  { test: /chimney|hob/i, icon: 'ss-chimney' },
  { test: /gas|stove|flame/i, icon: 'ss-flame' },
  { test: /geyser|water\s*heater/i, icon: 'ss-geyser' },
  { test: /inverter|\bups\b|battery/i, icon: 'ss-battery' },
  { test: /microwave|oven/i, icon: 'ss-microwave' },
  { test: /refrigerator|fridge/i, icon: 'ss-fridge' },
  { test: /purifier|ro\b|water/i, icon: 'ss-water' },
  { test: /\btv\b|television|entertainment/i, icon: 'ss-tv' },
  { test: /makeup|brush/i, icon: 'ss-brush' },
  { test: /massage|spa/i, icon: 'ss-spa' },
  { test: /mehendi|flower/i, icon: 'ss-flower' },
  { test: /salon|beautician|scissor|hair/i, icon: 'ss-scissors' },
  { test: /clean|pest|sweep/i, icon: 'ss-cleaning' },
  { test: /appliance/i, icon: 'ss-appliance' },
  { test: /beauty|personal\s*care/i, icon: 'ss-beauty' },
];

export function resolveServiceIconName(name?: string | null): SvgIconName {
  const value = (name || '').toLowerCase();
  if (!value.trim()) return 'wrench';
  for (const rule of KEYWORD_RULES) {
    if (rule.test.test(value)) return rule.icon;
  }
  return 'wrench';
}
