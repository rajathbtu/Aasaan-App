# Aasaanly Animated Service Icon Loader

This component reuses the existing `ss-*` service SVGs from the uploaded Aasaanly assets.

## Integration
1. Copy `components/AnimatedServiceIconLoader.tsx` into your app.
2. Keep using the existing `assets/icons/index.tsx` SVG registry. It already exports all ten `ss-*` icon names.
3. If your TypeScript alias differs, update only `import SvgIcon from "@/assets/icons";`.
4. No new dependency is required if the app already uses `react-native-svg` through the existing SvgIcon component.

## Usage
```tsx
<AnimatedServiceIconLoader
  subtitle="Connecting you with local help"
  showBrand
  size={112}
/>
```

## Behavior
- Ten icons are mounted together in one absolute-positioned stack.
- Switch interval defaults to 250ms.
- Only opacity and transform are animated with the native driver.
- The Aasaanly green stroke is applied through the existing SvgIcon color prop.
- Timer and animations are cleaned up on unmount.

## Selected source icons
`ss-ac`, `ss-water`, `ss-cleaning`, `ss-chimney`, `ss-geyser`, `ss-appliance`, `ss-tv`, `ss-microwave`, `ss-fridge`, `ss-brush`.

The SVGs in `assets/icons/` are copies of the exact uploaded source files. Production should continue using the app's canonical `assets/icons/index.tsx` registry to avoid duplicate assets.
