import React from 'react';
import { SvgXml } from 'react-native-svg';

/**
 * Renders any of the supplied SVG icon assets as a React Native component.
 * Icons are sourced from approved designs. The `color` prop
 * replaces `currentColor` occurrences in the SVG markup so tinting works
 * correctly on all paths (stroke and fill).
 */
type SvgIconProps = {
  name:
    | 'bell'
    | 'bolt'
    | 'bookmark'
    | 'chart'
    | 'check'
    | 'chevron-down'
    | 'chevron-up'
    | 'clock'
    | 'closed'
    | 'crown'
    | 'headset'
    | 'home'
    | 'navigation'
    | 'phone'
    | 'pin'
    | 'shield'
    | 'sliders'
    | 'snowflake'
    | 'sound'
    | 'user'
    | 'coins'
    | 'award'
    | 'mf-globe'
    | 'mf-phone'
    | 'mf-users'
    | 'wrench'
    | 'x'
    // Service Area icons
    | 'sa-back'
    | 'sa-search'
    | 'sa-target'
    | 'sa-pin'
    | 'sa-radius'
    | 'sa-edit'
    | 'sa-arrow-right'
    | 'sa-layers'
    // Notifications icons
    | 'notif-back'
    | 'notif-briefcase'
    | 'notif-calendar'
    | 'notif-check-circle'
    | 'notif-check-double'
    | 'notif-chevron-right'
    | 'notif-close'
    // Service Selection Final icons
    | 'ss-ac'
    | 'ss-appliance'
    | 'ss-beauty'
    | 'ss-cleaning'
    | 'ss-chimney'
    | 'ss-flame'
    | 'ss-flower'
    | 'ss-fridge'
    | 'ss-geyser'
    | 'ss-microwave'
    | 'ss-scissors'
    | 'ss-brush'
    | 'ss-spa'
    | 'ss-tv'
    | 'ss-water'
    | 'ss-battery'
    | 'ss-arrow-right'
    | 'ss-close'
    | 'ss-search'
    // Name/OTP Verification icons
    | 'nv-back'
    | 'nv-user'
    | 'nv-phone'
    | 'nv-shield-check'
    | 'nv-shield-lock'
    | 'nv-headset'
    // Language Selection icons
    | 'ls-globe'
    | 'ls-check';
  size?: number;
  color?: string;
  style?: any;
};

const ICON_SVG: Record<string, string> = {
  bell: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>`,
  bolt: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m13 2-3 9h7L9 22l2-9H5z"/></svg>`,
  bookmark: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18l-6-4-6 4z"/></svg>`,
  chart: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5M4 19h17M8 16v-4M13 16V8M18 16V4"/></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg>`,
  'chevron-down': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
  'chevron-up': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg>`,
  clock: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  closed: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>`,
  crown: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m2 8 5 4 5-8 5 8 5-4-2 12H4zM4 22h16"/></svg>`,
  headset: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13v-2a9 9 0 0 1 18 0v2M3 13h4v7H5a2 2 0 0 1-2-2zM21 13h-4v7h2a2 2 0 0 0 2-2z"/></svg>`,
  home: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7v10h-6v-7H9v7H3z"/></svg>`,
  navigation: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m21 3-7.5 18-3.5-7-7-3.5z"/><path d="m10 14 4-4"/></svg>`,
  pin: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/></svg>`,
  phone: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  shield: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z"/><path d="m9 12 2 2 4-4"/></svg>`,
  sliders: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg>`,
  snowflake: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M4 6l16 12M20 6 4 18M8 3l4 3 4-3M8 21l4-3 4 3"/></svg>`,
  sound: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10v4M7 7v10M11 4v16M15 8v8M19 10v4"/></svg>`,
  user: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg>`,
  // Role Selection icons
  coins: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="9" cy="6" rx="6" ry="3"/><path d="M3 6v4c0 1.7 2.7 3 6 3 1 0 2-.1 2.8-.4M3 10v4c0 1.7 2.7 3 6 3 1 0 2-.1 2.8-.4"/><ellipse cx="16" cy="14" rx="5" ry="2.5"/><path d="M11 14v5c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-5"/></svg>`,
  award: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="m8 13-1 9 5-3 5 3-1-9M9.5 8l1.7 1.7L15 6"/></svg>`,
  // Mobile Entry icons
  'mf-globe': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>`,
  'mf-phone': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 2.8a2 2 0 0 1-.6 1.9L7.2 10a16 16 0 0 0 6 6l1.6-1.8a2 2 0 0 1 1.9-.6l2.8.5a2 2 0 0 1 1.5 1.8z"/></svg>`,
  'mf-users': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>`,
  wrench: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 6a5 5 0 0 0 6 6l-9.5 9.5a2.1 2.1 0 0 1-3-3L17 9a5 5 0 0 0-6-6l3 3z"/></svg>`,
  x: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m18 6-12 12M6 6l12 12"/></svg>`,
  // --- Service Area icons ---
  'sa-back': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 12H5m0 0 7-7m-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'sa-search': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="m16 16 5 5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`,
  'sa-target': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  'sa-pin': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 10c0 5.1-8 12-8 12S4 15.1 4 10a8 8 0 1 1 16 0Z" fill="currentColor"/><circle cx="12" cy="10" r="2.7" fill="#fff"/></svg>`,
  'sa-radius': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 16 16 4m-8 0h8v8M20 8 8 20m8 0H8v-8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'sa-edit': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m14 5 5 5M4 20l4.2-.9L20 7.3 16.7 4 4.9 15.8 4 20Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  'sa-arrow-right': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 12h15m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'sa-layers': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  // --- Notifications icons ---
  'notif-back': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 12H5m0 0 7-7m-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'notif-briefcase': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></svg>`,
  'notif-calendar': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>`,
  'notif-check-circle': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>`,
  'notif-check-double': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m2 12 4 4L16 6"/><path d="m9 12 4 4L23 6"/></svg>`,
  'notif-chevron-right': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
  'notif-close': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m18 6-12 12M6 6l12 12"/></svg>`,
  // --- Service Selection Final icons ---
  'ss-ac': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="10" rx="1.5"/><path d="M5 15v3m14-3v3M7 18l-1 2m11-2 1 2M5 9h14"/></svg>`,
  'ss-appliance': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="1.5"/><path d="M6 18v2m12-2v2M6 10h12"/></svg>`,
  'ss-beauty': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21c-5-2-8-6-8-10 4 0 7 2 8 6 1-4 4-6 8-6 0 4-3 8-8 10Z"/><path d="M12 17c-3-5-3-9 0-13 3 4 3 8 0 13Z"/></svg>`,
  'ss-cleaning': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5L12 2Z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/></svg>`,
  'ss-chimney': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3h8v5l4 5v5H4v-5l4-5V3Z"/><path d="M8 8h8M4 14h16M10 18v1m4-1v1"/></svg>`,
  'ss-flame': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c-4 0-7-3-7-7 0-4 3-7 5-12 1 4 5 5 7 9 3 6-1 10-5 10Z"/><path d="M12 22c-2-1-3-3-2-5 1-2 2-2 3-5 3 4 4 8-1 10Z"/></svg>`,
  'ss-flower': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c2-2 5 0 4 3 3-1 5 2 3 4 3 1 3 5 0 6 1 3-2 5-5 3-1 3-5 3-6 0-3 2-6 0-5-3-3-1-3-5 0-6-2-2 0-5 3-4-1-3 2-5 6-3Z"/><circle cx="12" cy="12" r="2"/></svg>`,
  'ss-fridge': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M5 11h14M9 6v2m0 6v3"/></svg>`,
  'ss-geyser': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="18" rx="3"/><path d="M12 5v2m-2 10h4m-3 3v3m2-3v3"/></svg>`,
  'ss-microwave': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><rect x="5" y="7" width="11" height="10" rx="1"/><path d="M18 8h1m-1 4h1m-1 4h1"/></svg>`,
  'ss-scissors': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="m8 8 12 12M8 16 20 4"/></svg>`,
  'ss-brush': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m14 4 6 6M12 6l6 6M4 20l8-8 4 4-8 8H4v-4Z"/></svg>`,
  'ss-spa': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21c-5-2-8-6-8-10 4 0 7 2 8 6 1-4 4-6 8-6 0 4-3 8-8 10Z"/><path d="M12 17c-3-5-3-9 0-13 3 4 3 8 0 13Z"/></svg>`,
  'ss-tv': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="14" rx="1.5"/><path d="M8 21h8m-4-4v4"/></svg>`,
  'ss-water': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13Z"/><path d="M9 16c.3 1.5 1.2 2.3 2.5 2.5"/></svg>`,
  'ss-battery': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="18" height="12" rx="2"/><path d="M22 10v4M12 8l-3 5h4l-1 3 4-6h-4l1-2Z"/></svg>`,
  'ss-arrow-right': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 12h15m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'ss-close': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m18 6-12 12M6 6l12 12"/></svg>`,
  'ss-search': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="m16 16 5 5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`,
  // --- Name/OTP Verification icons ---
  'nv-back': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 12H5m7 7-7-7 7-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'nv-user': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>`,
  'nv-phone': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h3l2 5-2 2a15 15 0 0 0 4 4l2-2 5 2v3c0 1-1 2-2 2A16 16 0 0 1 5 5c0-1 1-2 2-2Z"/></svg>`,
  'nv-shield-check': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></svg>`,
  'nv-shield-lock': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><rect x="9" y="10" width="6" height="5" rx="1"/><path d="M10 10V8a2 2 0 1 1 4 0v2"/></svg>`,
  'nv-headset': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13v-2a9 9 0 0 1 18 0v2"/><path d="M3 13h3v7H5a2 2 0 0 1-2-2v-5Zm18 0h-3v7h1a2 2 0 0 0 2-2v-5Z"/></svg>`,
  // --- Language Selection icons ---
  'ls-globe': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/></svg>`,
  'ls-check': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4.5 4.5L19 7"/></svg>`,
};

const SvgIcon: React.FC<SvgIconProps> = ({ name, size = 20, color, style }) => {
  let xml = ICON_SVG[name] ?? '';
  if (!xml) return null;
  if (color) {
    // Replace currentColor references with the actual color value so
    // tinting works reliably on all SVG paths (stroke and fill).
    xml = xml.replace(/currentColor/g, color);
  }
  return <SvgXml xml={xml} width={size} height={size} style={style} />;
};

export default SvgIcon;
