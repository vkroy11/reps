import { useRouter } from 'expo-router';
import { CheerInterstitial } from '../../features/onboarding/CheerInterstitial';
import { nextHref } from '../../features/onboarding/navigation';

/**
 * After the weekly time. This is the answer people talk themselves out of, so
 * it names the two fears directly: that the sessions are too long to keep up,
 * and that missing a day undoes the work.
 */
export default function Cheer2Screen() {
  const router = useRouter();

  return (
    <CheerInterstitial
      panelKey="time"
      kicker="Almost there"
      title="Your week fits the path"
      body="Sessions this size are short enough to actually happen. One question left, then Reps builds it."
      facts={['Sessions stay under your limit', 'Miss a day, nothing resets']}
      ctaLabel="Last question"
      onContinue={() => router.push(nextHref('cheer2'))}
    />
  );
}
