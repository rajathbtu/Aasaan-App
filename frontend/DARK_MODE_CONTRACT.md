# Dark Mode Conversion Contract (Aasaan frontend)

Read this fully before touching any file. `ProfileScreen.tsx` is the completed
reference implementation — copy its patterns exactly.

## Infrastructure (already done — do NOT edit these files)

- `src/theme/palette.ts` — three palette families, each with `light` and `dark`
  variants (dark values are type-enforced to cover every light key):
  - `base` — global tokens (old theme.ts `colors`) + shared onboarding tokens.
  - `consumer` — consumerColors + WorkRequest details + KYC tokens.
  - `profile` — profileColors + Notifications tokens.
- `src/contexts/ThemeContext.tsx` — `ThemeProvider` + `useTheme()` returning
  `{ mode, isDark, setMode, toggleMode, base, consumer, profile, navTheme, mapStyle }`.
- `App.tsx` — provider tree, themed NavigationContainer, StatusBar bridge, tab bar.

**Never** edit `src/theme/palette.ts`, `src/contexts/ThemeContext.tsx`, `App.tsx`,
`src/theme.ts`, or `src/theme/profile.ts`. If a token you need is missing, map to
the nearest existing token and note it in your report.

## The conversion recipe (per file)

1. **Import the hook.** Path depth: `src/screens/X.tsx` → `../contexts/ThemeContext`;
   `src/screens/kyc/sandbox/X.tsx` → `../../../contexts/ThemeContext`;
   `src/components/X.tsx` → `../contexts/ThemeContext`.
2. **Pick the family** in the component body:
   - file imported `colors` from `../theme` → `const { base: C, isDark } = useTheme();`
   - file imported `consumerColors` → `const { consumer: C, isDark } = useTheme();`
   - file had a local palette → use the mapping table below (usually `base` or
     `consumer`); destructure that family as `C`.
   Keep the local variable name `C` even if the file used another name — update
   all usages (e.g. `SA.green` → `C.brand`). Remove the static palette import /
   local palette object entirely.
3. **Make styles reactive.** Module-level `const styles = StyleSheet.create({...})`
   becomes `const makeStyles = (C: <Family>Palette) => StyleSheet.create({...})`
   (import the type from `../theme/palette`, e.g. `BasePalette`, `ConsumerPalette`,
   `ProfilePalette`), and inside the component:
   `const styles = useMemo(() => makeStyles(C), [C]);` (import `useMemo` from react).
   - If the file has several components each needing styles, either pass `C`
     down or give each component its own `useTheme()` + `makeStyles` call.
   - Small helper sub-components defined in the same file (e.g. `SkeletonCard`)
     must also call `useTheme()` themselves if they render colors directly.
4. **Replace every color literal with the nearest palette token.** Font sizes,
   weights, spacing, radii, border widths, layout: DO NOT CHANGE.
5. **JSX inline colors** (style objects and icon `color=` props) get tokens too.
6. **Text sitting on a colored fill** (green/CTA buttons, gradient banners,
   purple cards) must use `C.onPrimary` — never `C.white` (which flips to a dark
   surface in dark mode and would become invisible). Grep your file for
   `color: C.white` / `color={C.white}` and decide each one.
7. **StatusBar** (expo-status-bar): `style="dark"` →
   `style={isDark ? 'light' : 'dark'}`. Exceptions that stay light: the payment
   WebView header (RazorpayWebView) — keep it light with a comment.
8. **TextInput**: add `keyboardAppearance={isDark ? 'dark' : 'light'}`.
9. **Modal backdrops**: replace literal `rgba(0,0,0,…)` / `rgba(17,24,39,…)`
   scrims with `C.scrim`.
10. **Gradients** (`LinearGradient colors={[...]}`) map to palette gradient
    token pairs (`ctaStart/ctaEnd`, `tabActiveStart/End`, `acceptStart/End`,
    `heroMintStart/Mid/End`, `paymentSelectedBg/End`…). White text on them →
    `C.onPrimary`.
11. **Shadows**: keep opacity/offset/radius; `shadowColor` may stay a literal or
    become `C.black`. Do not remove shadows.
12. **Images/photos**: containers and placeholder backgrounds use tokens
    (`C.imageBg`, `C.skeletonBlock`, mint tints…). The SVG/PNG assets themselves
    are self-contained artworks — leave them untouched.
13. **Surfaces that must stay light in dark mode** (only the payment/Razorpay
    WebView chrome): keep the white background and dark text, add a
    `// stays light: hosts a light web page` comment. Nothing else stays light.
14. **Empty/pressed/disabled states, borders, dividers** all get tokens — sweep
    the whole file, not just the main styles.

## Local-palette → token mapping

`base` family (rename `X.token` → `C.<mapped>`):

| Local palette | Mapping |
| --- | --- |
| LS (LanguageSelection) | brand→brand, brandDeep→brandDeep, brandBright→brandBright, mint→primarySoft, mintStrong→mintStrong, ink→dark, title→dark, muted→grey, border→greyLight, surface→white, canvas→canvas, selectionBorder→selectionBorder, footerBorder→footerBorder, backBg→backBg, pillBg→pillBg, selectedBg→selectedBg |
| SA (LocationSelect) | green→brand, green2→green2, dark→dark, muted→grey, border→greyLight, mint→backBg, mintButton→mintButton, currentLocBorder→currentLocBorder, currentLocBg→currentLocBg, currentLocText→currentLocText, iconTileBg→iconTileBg, radiusBtnBorder→radiusBtnBorder, radiusBtnText→radiusBtnText, footerBorder→footerBorder, mapBg→mapBg |
| ME (MobileInput) | brand→brand2, brandDark→brandDeep, mint→backBg, mintSoft→pillBg, ink→dark, muted→grey, line→line, canvas→canvas, fieldBorder→fieldBorder, placeholder→placeholder, danger→danger, termsText→termsText, topbarLine→topbarLine, socialBorder→socialBorder, socialIconBg→socialIconBg, socialWave→socialWave, pageWave→pageWave |
| NT (NameOTP) | green→brand, greenDark→brandDark, greenBright→brandBright, mint→backBg, mintSoft→pillBg, ink→dark, muted→grey, line→line, field→field, placeholder→placeholder, danger→danger, secureText→secureText, topbarLine→topbarLine, backCircle→backBg, divider→divider |
| RS (RoleSelect) | green→brand, brandGreen→brand, ctaGreen→green2, labelGreen→labelGreen, ink→dark, muted→grey, cardBorder→cardBorder, selectedSurface→selectedSurface, labelBg→labelBg, benefitTile→benefitTile, benefitText→benefitText, radioBorder→radioBorder, hint→hint, footerBorder→footerBorder |
| SS (both files) | green→brand, greenDark→brandDark, greenSoft→greenSoft, greenSelected→greenSelected, ink→dark, muted→grey, line→line, cardBorder→cardBorder, tabBorder→tabBorder, tabText→tabText, sectionAccent→sectionAccent, chipText→chipText, selectionHeadingText→selectionHeadingText, serviceName→serviceName, searchBorder→searchBorder, searchPlaceholder→searchPlaceholder, footerBorder→footerBorder, headerBorder→headerBorder |
| NV (OtpInput) | green→brand, ink→dark, muted→grey, line→line |
| `colors.X` / `tints.purpleSoft|blueSoft|greenSoft|orangeSoft|amberSoft` | `C.X` / `C.tintPurpleSoft|tintBlueSoft|tintGreenSoft|tintOrangeSoft|tintAmberSoft` |

`profile` family (NotificationsScreen):

| N.token | → P.token |
| --- | --- |
| primary→primary, primaryDark→primaryDark, primarySoft→primarySoft, ink→ink, muted→muted, border→border, page→page, unreadTint→unreadTint, unreadBorder→unreadBorder, countBg→countBg, desc→desc, sheetDesc→sheetDesc, sheetCloseBg→sheetCloseBg, markBorder→markBorder, markBg→markBg, markText→markText, skeletonBlock→skeletonBlock |

`consumer` family (WorkRequestDetails C and KYC C):

| C.token | → consumer.token |
| --- | --- |
| green→deepGreen, mintDeep→mintDeep, statusBg→statusBg, statusText→statusText, statusDot→statusDot, ink→ink, muted→muted, line→rowBorder, iconEdit→iconEdit, iconShare→iconShare, iconClose→iconClose, filterBorder→filterBorder, filterText→filterText, listBorder→listBorder, rowBorder→rowBorder, metaInk→metaInk, respGreenBg→respGreenBg, respGreenText→respGreenText, respBlueBg→respBlueBg, respBlueText→respBlueText, respPurpleBg→respPurpleBg, respPurpleText→respPurpleText, acceptStart→acceptStart, acceptEnd→acceptEnd, acceptedBg→acceptedBg, acceptedText→acceptedText, profileBorder→profileBorder, profileBg→profileBg, profileText→profileText, verifiedBg→verifiedBg, star→star, onlineDot→onlineDot |
| KYC C: green→primary, greenDark→primaryDark, mint→mint, mintStrong→mintDeep, ink→ink, muted→muted, border→border, surface→white, page→page, inputBorder→inputBorder, consentBg→consentBg, error→errorText |

## Pre-existing TS errors — fix if the file is yours

- `components/OtpInput.tsx` — `StyleSheet.absoluteFillObject` doesn't exist in
  current RN types (2 places) → use `{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }`;
  TextInput ref typing errors → type the ref as `React.useRef<TextInput | null>(null)`.
- `components/Spinner.tsx` — same `absoluteFillObject` fix.
- `components/RazorpayWebView.tsx` — RN `StatusBar` has no `backgroundColor`
  prop in these types → drop that prop, keep `barStyle`.
- `screens/ProfileImageModerationScreen.tsx(93)` — `Element | null` not
  assignable → coerce with `?? undefined`.

## Verification (every child, before reporting)

1. `cd /Users/mac/Downloads/aasaan-app/frontend && npx tsc --noEmit` — your files
   must add ZERO new errors (the 4 pre-existing ones above are acceptable until
   you fix them in your own files).
2. `grep -n '#[0-9a-fA-F]\{3,8\}' <your files>` — every remaining literal must be
   justified: shadowColor literals, scrims you intentionally kept, or
   stays-light payment chrome with a comment. Anything else → replace with a token.
3. Do not run metro, do not build, do not edit files outside your list.
