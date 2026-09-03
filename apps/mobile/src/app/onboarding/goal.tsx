import { stepAfter } from '@reps/client';
import { useRouter } from 'expo-router';
import { SuggestionQuestion } from '../../features/onboarding/SuggestionQuestion';
import { useApp } from '../../providers/app-provider';

export default function GoalScreen() {
  const router = useRouter();
  const { draft, patchDraft } = useApp();

  return (
    <SuggestionQuestion
      step="goal"
      question="What do you want to be able to do?"
      aside={`Written for ${draft.skill?.trim() || 'this skill'} — not a generic list.`}
      pipAside="These are written for your skill, not pulled off a list."
      skill={draft.skill}
      select={(suggestions) => suggestions.goals}
      value={draft.goal}
      customPlaceholder="e.g. play 5 songs at a campfire"
      onSubmit={(goal) => {
        patchDraft({ goal });
        router.push(`/onboarding/${stepAfter('goal')}`);
      }}
    />
  );
}
