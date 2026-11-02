import React from 'react';
import { SvgXml } from 'react-native-svg';

const HeroToolbox: React.FC = () => (
  <SvgXml
    xml={`
<svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Toolbox body -->
  <rect x="12" y="34" width="48" height="26" rx="6" fill="#86EFAC" stroke="#4ADE80" strokeWidth="2"/>
  <!-- Toolbox handle -->
  <path d="M30 34 Q36 20 42 34" stroke="#4ADE80" strokeWidth="3" strokeLinecap="round"/>
  <!-- Wrench -->
  <path d="M24 44 L32 44" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round"/>
  <circle cx="20" cy="44" r="4" fill="#FBBF24"/>
  <circle cx="36" cy="44" r="2" fill="#FBBF24"/>
  <!-- Screwdriver -->
  <path d="M20 50 L28 50" stroke="#EF4444" strokeWidth="3" strokeLinecap="round"/>
  <rect x="18" y="48" width="4" height="4" rx="2" fill="#EF4444"/>
  <!-- Hammer -->
  <path d="M40 44 L40 50" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round"/>
  <rect x="36" y="50" width="8" height="4" rx="2" fill="#94A3B8"/>
  <!-- Nuts/Bolts -->
  <circle cx="50" cy="48" r="2" fill="#FBBF24"/>
  <circle cx="54" cy="46" r="1.5" fill="#94A3B8"/>
  <circle cx="46" cy="46" r="1.5" fill="#FBBF24"/>
</svg>
    `}
    width={72}
    height={72}
    style={{ flexShrink: 0 }}
  />
);

export default HeroToolbox;