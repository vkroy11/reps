import { useRouter } from 'expo-router';
import { nextHref } from '../../features/onboarding/navigation';
import { SuggestionQuestion } from '../../features/onboarding/SuggestionQuestion';
import { useApp } from '../../providers/app-provider';

export default function LevelScreen() {
  const router = useRouter();
  const { draft, patchDraft } = useApp();

  return (
    <SuggestionQuestion
      step="level"
      question="Where are you now?"
      aside="Be honest. This decides where the path starts, not how good you are."
      pipAside="Honest beats flattering. It only moves the starting line."
      skill={draft.skill}
      select={(suggestions) => suggestions.levels}
      value={draft.level}
      customPlaceholder="e.g. I can hold chords but changes stall"
      onSubmit={(level) => {
        patchDraft({ level });
        router.push(nextHref('level'));
      }}
    />
  );
}
