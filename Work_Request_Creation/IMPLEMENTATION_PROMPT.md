# Aasaanly Work Request Creation — Pixel-Matched Implementation Prompt

The authoritative reference is `approved_reference_852x1846.png`. Implement the screen to match this image, not to reinterpret or modernize it. Use the HTML/CSS prototype as a pixel-positioned visual reference.

## Exact reference dimensions and composition
Reference canvas: 852 × 1846 px. The supplied prototype uses a 852px design canvas scaled proportionally to the available viewport. Preserve these proportions.

- Status bar strip: original reference crop, 852 × 48 at top.
- Back button: x40 y68, 75 × 75 px.
- Service heading starts x40 around y185; title 43px bold, subtitle 27px.
- Hero illustration: x465 y78, 360 × 238 px. Use supplied crop from the exact approved reference so the art is not approximated.
- Benefits row: x30 y310, 774 × 69 px; three equal 250px pills with 12px gaps.
- Description card: x22 y412, 788 × 290 px. Heading/icon row, counter at right; textarea x49 y527, 734 × 142 px.
- Tags card: x22 y722, 788 × 353 px. Heading/icon row and three explicitly aligned tag rows. Do not auto-reflow into a different grid at the reference viewport.
- Call card: x22 y1095, 788 × 217 px. Toggle at right, privacy strip beneath description.
- Location card: x22 y1333, 788 × 230 px. Location selection row inset 27px.
- Confirm CTA: x23 y1620, 786 × 93 px.

## Visual details
Use the exact attached screenshot for colors, text weight, border radii, shadows, card fills, icon placement, row spacing and line heights. Preserve the cool blue-grey text and borders with green/mint accents. Do not substitute the hero illustration with a newly generated clipboard graphic: use `assets/hero_illustration_reference.png`, which is cropped from the approved screenshot. The status bar strip is also supplied as a crop to match the Android reference.

## Interactions
- 80-character description limit and live counter.
- Multi-select tag pills; selected state swaps plus to check without moving text.
- Call permission switch.
- Back navigation.
- Confirm Request must connect to existing request API and app validation in production.

## Production integration
Inspect existing Aasaanly screen, API schema, service context, tag IDs, location flow, Aadhaar-verified call permission, global loader and navigation before coding. Preserve all existing behavior and bind actual data. The reference uses AC Service & Repair and Jhansi, Uttar Pradesh as displayed example values; production must use current selected service and actual chosen location. Do not invent backend fields or alter consent defaults.

## Deliverable requirements
Implement native React Native UI using existing design tokens/components where practical. Match the reference screenshot at the same aspect ratio. Test at the reference viewport and smaller device sizes. Report changed files, preserved integrations and screenshot comparison results.
