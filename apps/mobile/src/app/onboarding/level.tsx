import { useRouter } from 'expo-router';
import { SuggestionQuestion } from '../../features/onboarding/SuggestionQuestion';
import { useApp } from '../../providers/app-provider';

export default function LevelScreen() {
  const router = useRouter();
  const { draft, patchDraft } = useApp();

  return (
    <SuggestionQuestion
      step="level"
      question="Where are you now?"
      skill={draft.skill}
      select={(suggestions) => suggestions.levels}
      value={draft.level}
      customPlaceholder="Describe where you're starting from"
      onSubmit={(level) => {
        patchDraft({ level });
        router.push('/onboarding/time');
      }}
    />
  );
}
