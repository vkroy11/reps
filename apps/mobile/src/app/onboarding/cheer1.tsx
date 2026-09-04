import { useRouter } from 'expo-router';
import { CheerInterstitial } from '../../features/onboarding/CheerInterstitial';
import { nextHref } from '../../features/onboarding/navigation';

/**
 * After the goal. Reframes what a good goal buys the learner: an app that can
 * tell when the path is finished, which is the whole promise.
 */
export default function Cheer1Screen() {
  const router = useRouter();

  return (
    <CheerInterstitial
      panelKey="goal"
      kicker="Good answer"
      title="That one has a clear finish line"
      body="Goals you can point at are the ones people finish. Reps can tell when this is done, so it can tell when to stop."
      facts={['5 to 8 techniques', 'No endless syllabus']}
      ctaLabel="Keep going"
      onContinue={() => router.push(nextHref('cheer1'))}
    />
  );
}
