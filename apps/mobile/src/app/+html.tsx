import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

/** Where the app is served from. Absolute URLs are required for og:image. */
const SITE = 'https://reps.vishalkumarroy.xyz';
const TITLE = 'Reps — get good at one thing at a time';
const DESCRIPTION =
  'Reps builds a short path of 5–8 techniques for the hobby you pick, finds the right thing to watch, and tracks practice until you can do the thing.';

/** `--app-height` is `visualViewport.height` on web; `100svh` until that runs. */
const RESET = `
  html, body { margin: 0; overflow: hidden; overscroll-behavior-y: none; height: 100%; }
  #root { display: flex; flex: 1 1 auto; height: 100%; }
  @supports (height: 100svh) {
    html, body, #root { height: var(--app-height, 100svh); }
  }
`;

/**
 * The HTML shell every statically rendered route is wrapped in.
 *
 * This exists for the link preview. Sharing the URL used to produce a bare
 * link with no title at all - the export had no `<title>` and no metadata, so
 * WhatsApp, Slack and iMessage had nothing to render and fell back to the
 * hostname.
 *
 * The tags are identical on every route, which is the honest choice here: the
 * app is one product behind a client-side router, and every deep link into it
 * lands somebody on the same first-run screen unless they already have data.
 * Per-route previews would describe screens a stranger cannot reach.
 *
 * `og:image` must be an absolute URL - crawlers do not resolve relative paths -
 * and the width and height let WhatsApp reserve the right shape before the
 * image arrives, which is the difference between a large card and a thumbnail.
 */

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* viewport-fit=cover so the gradient panel reaches the notch. */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="theme-color" content="#2563EB" />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Reps" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={SITE} />
        <meta property="og:image" content={`${SITE}/og.png`} />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Reps — get good at one thing at a time" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={`${SITE}/og.png`} />

        {/*
          Disables body scrolling on web so the app's own ScrollViews behave
          the way they do on native. Required by Expo Router's static output.
        */}
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: RESET }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
