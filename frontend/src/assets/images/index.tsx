import React from 'react';
import { SvgXml } from 'react-native-svg';

/**
 * Hero toolbox illustration — displayed in the hero/intro section.
 */
export const HeroToolbox: React.FC<{ size?: number; color?: string }> = ({ size = 112 }) => (
  <HeroToolboxSvg width={size} height={size * 120 / 150} />
);

export const HeroToolboxSvg: React.FC<{ width?: number; height?: number }> = ({ width = 112, height = 105 }) => (
  <SvgXml
    xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 120"><rect x="20" y="39" width="110" height="69" rx="13" fill="#00a96b"/><rect x="31" y="29" width="88" height="18" rx="6" fill="#087b50"/><path d="M48 30V19h54v11" fill="none" stroke="#087b50" stroke-width="8" stroke-linecap="round"/><path d="m47 10 14 8-8 31-13-5z" fill="#0d8b61"/><path d="m100 5 11 4-13 41-11-4z" fill="#8d99a5"/><circle cx="75" cy="74" r="5" fill="#b7f2d4"/><path d="M20 57h110" stroke="#078d59" stroke-width="4"/></svg>`}
    width={width}
    height={height}
    style={{ flexShrink: 0 }}
  />
);

/**
 * Air conditioner illustration — displayed in each work request card.
 */
export const AirConditioner: React.FC<{ size?: number }> = ({ size = 96 }) => (
  <SvgXml
    xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 140"><defs><linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#dce9f4"/></linearGradient></defs><ellipse cx="90" cy="119" rx="62" ry="8" fill="#b7d9e4" opacity=".35"/><path d="M24 32Q24 22 36 19L142 9Q155 8 157 19V76Q157 85 146 87L35 99Q24 100 24 90Z" fill="url(#body)" stroke="#b9cbd9" stroke-width="2"/><path d="M28 70 154 57v15L28 87z" fill="#24394b"/><path d="M34 74 149 62" stroke="#8ca5b6" stroke-width="3"/><path d="M39 92q-5 14-10 30M81 88q-4 18-4 35M125 83q2 17 10 33" stroke="#54cce5" stroke-width="8" stroke-linecap="round" fill="none"/></svg>`}
    width={size}
    height={size * 140 / 180}
    style={{ flexShrink: 0 }}
  />
);

/**
 * Customer avatar placeholder — displayed in each work request card.
 */
export const CustomerAvatar: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <SvgXml
    xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#e7edf2"/><text x="40" y="54" text-anchor="middle" font-family="Arial,sans-serif" font-size="42" font-weight="700" fill="#25304a">W</text></svg>`}
    width={size}
    height={size}
    style={{ flexShrink: 0 }}
  />
);
/**
 * India flag — Mobile_Entry_Handoff country prefix artwork (36×24).
 */
export const IndiaFlag: React.FC<{ width?: number; height?: number }> = ({ width = 32, height = 22 }) => (
  <SvgXml
    xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 24"><rect width="36" height="8" fill="#FF9933"/><rect y="8" width="36" height="8" fill="#FFFFFF"/><rect y="16" width="36" height="8" fill="#138808"/><circle cx="18" cy="12" r="3.1" fill="none" stroke="#000080" stroke-width="0.8"/><circle cx="18" cy="12" r="0.55" fill="#000080"/><g stroke="#000080" stroke-width="0.35"><path d="M18 8.9v6.2M14.9 12h6.2M15.8 9.8l4.4 4.4M20.2 9.8l-4.4 4.4"/></g></svg>`}
    width={width}
    height={height}
    style={{ flexShrink: 0 }}
  />
);
