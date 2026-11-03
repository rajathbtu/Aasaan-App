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
 * India flag — country prefix artwork (36×24).
 */
export const IndiaFlag: React.FC<{ width?: number; height?: number }> = ({ width = 32, height = 22 }) => (
  <SvgXml
    xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 24"><rect width="36" height="8" fill="#FF9933"/><rect y="8" width="36" height="8" fill="#FFFFFF"/><rect y="16" width="36" height="8" fill="#138808"/><circle cx="18" cy="12" r="3.1" fill="none" stroke="#000080" stroke-width="0.8"/><circle cx="18" cy="12" r="0.55" fill="#000080"/><g stroke="#000080" stroke-width="0.35"><path d="M18 8.9v6.2M14.9 12h6.2M15.8 9.8l4.4 4.4M20.2 9.8l-4.4 4.4"/></g></svg>`}
    width={width}
    height={height}
    style={{ flexShrink: 0 }}
  />
);

/**
 * Aadhaar verification assets — approved design.
 * Colors match the design: primary green #079B60, dark green #07864F,
 * mint #E8F8F0, ink #17232C, muted #66717F, border #E1E9E6, page #F7FCF9.
 */

/** Back arrow for the header — approved design assets. */
export const ArrowBack: React.FC<{ size?: number; color?: string }> = ({ size = 24, color = 'currentColor' }) => (
  <SvgXml
    xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 12H5m7 7-7-7 7-7" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`}
    width={size}
    height={size}
    style={{ flexShrink: 0 }}
  />
);

/** Identity card icon — approved design assets. */
export const IdentityCard: React.FC<{ size?: number; color?: string }> = ({ size = 25, color = 'currentColor' }) => (
  <SvgXml
    xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="${color}" stroke-width="1.8"/><path d="M3 9h18M7 14h3m-3 2h6" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/></svg>`}
    width={size}
    height={size}
    style={{ flexShrink: 0 }}
  />
);

/** Send icon — approved design assets. */
export const SendIcon: React.FC<{ size?: number; color?: string }> = ({ size = 23, color = '#FFFFFF' }) => (
  <SvgXml
    xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m21 3-7.2 18-3.9-7.9L2 9.2 21 3Z" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round"/><path d="m9.9 13.1 5-5" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/></svg>`}
    width={size}
    height={size}
    style={{ flexShrink: 0 }}
  />
);

/** Large hero illustration — approved design assets. */
export const AadhaarVerificationIllustration: React.FC<{ width?: number; height?: number }> = ({ width = 390, height = 255 }) => (
  <SvgXml
    xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420" role="img" aria-labelledby="title desc"><title id="title">Aadhaar identity verification illustration</title><desc id="desc">An identity card protected by a green verification shield on a mint background.</desc><defs><linearGradient id="mint" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#DFF8EC"/><stop offset="1" stop-color="#BDEED8"/></linearGradient><linearGradient id="green" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#12B978"/><stop offset="1" stop-color="#07864F"/></linearGradient><filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#164B38" flood-opacity=".16"/></filter></defs><path d="M72 210C45 133 112 58 202 64c65-57 153-39 197 13 82-9 154 48 150 119 36 72-20 153-104 155H156C70 351 25 280 72 210Z" fill="url(#mint)"/><circle cx="535" cy="75" r="9" fill="#9BE2C3"/><circle cx="565" cy="106" r="5" fill="#9BE2C3"/><path d="M88 105l16-17m-2 39 24-3" stroke="#0A9B62" stroke-width="9" stroke-linecap="round"/><g filter="url(#shadow)" transform="rotate(-5 300 205)"><rect x="105" y="104" width="395" height="238" rx="28" fill="#fff" stroke="#D8E0E6" stroke-width="4"/><rect x="126" y="126" width="353" height="194" rx="17" fill="#FCFDFE"/><path d="M245 155c13-24 34-37 55-37 23 0 45 14 57 37" fill="none" stroke="#E8A817" stroke-width="9" stroke-linecap="round"/><path d="M254 174c12-24 29-36 47-36 18 0 35 12 47 36" fill="none" stroke="#E33C37" stroke-width="9" stroke-linecap="round"/><path d="M266 190c8-16 20-24 35-24 14 0 26 8 35 24" fill="none" stroke="#E33C37" stroke-width="8" stroke-linecap="round"/><text x="301" y="211" font-family="Arial,sans-serif" font-size="20" font-weight="700" text-anchor="middle" fill="#D83232">IDENTITY</text><rect x="138" y="226" width="82" height="78" rx="12" fill="#E9EEF3"/><circle cx="179" cy="253" r="16" fill="#718092"/><path d="M151 291c4-20 17-29 28-29s24 9 28 29" fill="#718092"/><rect x="241" y="235" width="158" height="13" rx="6.5" fill="#C8D0DA"/><rect x="241" y="262" width="139" height="13" rx="6.5" fill="#D6DCE4"/><rect x="241" y="289" width="103" height="11" rx="5.5" fill="#D6DCE4"/><g transform="translate(420 236)"><rect width="43" height="43" rx="5" fill="#17232C"/><path d="M6 6h10v10H6zm21 0h10v10H27zM6 27h10v10H6z" fill="#fff"/><path d="M22 6h4v4h-4zm-6 12h5v5h-5zm13 7h5v5h-5zm-8 9h5v5h-5z" fill="#fff"/></g></g><g filter="url(#shadow)" transform="translate(410 236)"><path d="M83 0 151 28v58c0 53-34 89-68 108C49 175 15 139 15 86V28Z" fill="url(#green)" stroke="#fff" stroke-width="9" stroke-linejoin="round"/><path d="m49 91 23 23 47-51" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`}
    width={width}
    height={height}
    style={{ flexShrink: 0 }}
  />
);

/**
 * Consumer home hero illustration — approved design asset (home_hero_illustration.svg).
 * viewBox 0 0 420 300. Rendered on the right side of the hero band.
 */
export const HomeHeroIllustration: React.FC<{ width?: number; height?: number }> = ({
  width = 210,
  height = 150,
}) => (
  <SvgXml
    xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 300"><defs><linearGradient id="m" x2="1" y2="1"><stop stop-color="#E4F8EF"/><stop offset="1" stop-color="#BCEED7"/></linearGradient><linearGradient id="c" x2="1" y2="1"><stop stop-color="#477CB2"/><stop offset="1" stop-color="#244D7D"/></linearGradient></defs><path d="M30 173C13 103 80 32 166 48c52-34 130-16 155 35 71 1 93 62 65 119-17 35-52 58-103 58H99c-44 0-68-34-69-87Z" fill="url(#m)"/><path d="M281 0v52m-15 0h30l-6 20h-18Z" stroke="#25323A" stroke-width="3" fill="#25323A"/><path d="M338 223c-4-53 0-92 12-132" stroke="#4B8A58" stroke-width="5" fill="none"/><path d="M349 123c-39-2-51-28-43-48 29 2 48 18 43 48Zm2 30c36-29 58-20 61 2-17 20-42 22-61-2Zm-8 26c-34-12-40-36-26-52 25 9 38 28 26 52Zm12-76c-3-29 16-43 34-35 1 24-13 39-34 35Z" fill="#3A9A55"/><path d="M329 217h49l-7 57h-35Z" fill="#E6E3DA"/><path d="M93 148c0-18 14-32 32-32h95c18 0 32 14 32 32v75H93Z" fill="url(#c)"/><path d="M105 143c0-17 12-29 29-29h80c17 0 29 12 29 29v57H105Z" fill="#5C8DBE"/><path d="M83 165c-13 0-23 11-23 24v53c0 11 9 20 20 20h26V166Zm175 0c13 0 23 11 23 24v53c0 11-9 20-20 20h-26V166Z" fill="#315E91"/><path d="M105 198h124v51c0 13-10 23-23 23h-78c-13 0-23-10-23-23Z" fill="#376D9F"/><path d="M146 126c22-12 47-8 60 7l-12 48h-51Z" fill="#F5F6F5"/><path d="M109 269v18m119-18v18" stroke="#604B3B" stroke-width="6" stroke-linecap="round"/></svg>`}
    width={width}
    height={height}
    style={{ flexShrink: 0 }}
  />
);
