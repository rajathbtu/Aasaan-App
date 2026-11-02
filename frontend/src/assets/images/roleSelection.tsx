import React from 'react';
import { Image } from 'react-native';
import { SvgXml } from 'react-native-svg';

/**
 * Role_Selection_Handoff illustrations — verbatim SVGs from the approved
 * handoff assets (neighborhood backdrop, consumer, service expert).
 */

export const RoleNeighborhood: React.FC<{ width?: number; height?: number; style?: any }> = ({
  width = 190, height = 105, style,
}) => (
  <SvgXml
    xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 210">
<defs><linearGradient id="rng" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#dff8ed"/><stop offset="1" stop-color="#b5ead7"/></linearGradient></defs>
<path d="M0 175Q55 130 100 160T205 142T310 125T480 155V210H0Z" fill="url(#rng)" opacity=".8"/>
<g fill="#c4eee0"><rect x="30" y="100" width="65" height="80" rx="5"/><rect x="115" y="78" width="52" height="102" rx="4"/><rect x="184" y="105" width="62" height="75" rx="5"/><rect x="300" y="65" width="58" height="115" rx="4"/><rect x="375" y="95" width="70" height="85" rx="4"/></g>
<g fill="#a7dfcb"><path d="M20 105h85l-42-40zM105 83h72l-36-37zM287 70h83l-41-38zM365 100h90l-45-38z"/></g>
<g fill="#eafff5"><rect x="48" y="120" width="14" height="20"/><rect x="73" y="120" width="14" height="20"/><rect x="129" y="99" width="13" height="20"/><rect x="151" y="99" width="13" height="20"/><rect x="317" y="87" width="15" height="21"/><rect x="340" y="87" width="15" height="21"/></g>
<path d="M0 185q35-30 70 0t70 0 70 0 70 0 70 0 70 0 60 0v25H0Z" fill="#a9e3d0"/>
</svg>`}
    width={width}
    height={height}
    style={style}
  />
);

/**
 * Role illustration artwork supplied as SVG-wrapped raster (consumer.svg /
 * service_expert.svg in the assets folder). The embedded original-color PNGs
 * were extracted verbatim into frontend/assets (role-consumer.png,
 * role-service-expert.png) because react-native-svg cannot render embedded
 * raster images efficiently — native Image keeps them crisp and cached.
 */
export const RoleConsumerArt: React.FC<{ width?: number | string; height?: number | string; style?: any }> = ({
  width, height, style,
}) => (
  <Image
    source={require('../../../assets/role-consumer.png')}
    style={[{ width: width ?? '100%', height: height ?? '100%' }, style]}
    resizeMode="contain"
  />
);

export const RoleExpertArt: React.FC<{ width?: number | string; height?: number | string; style?: any }> = ({
  width, height, style,
}) => (
  <Image
    source={require('../../../assets/role-service-expert.png')}
    style={[{ width: width ?? '100%', height: height ?? '100%' }, style]}
    resizeMode="contain"
  />
);
