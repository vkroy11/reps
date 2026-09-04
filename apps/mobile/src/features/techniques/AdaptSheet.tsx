import { ApiError } from '@reps/client';
import type { Technique } from '@reps/core';
import { ActionSheet, Button, PipMascot, Text, space } from '@reps/ui';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useApp } from '../../providers/app-provider';

export type AdaptAction = 'too_hard' | 'skip';

export interface AdaptSheetProps {
  action: AdaptAction | null;
  technique: Technique | null;
  onClose: () => void;
  onDone: () => void;
}

/**
 * Confirms the two path-changing actions, and says exactly what each does.
 *
 * The wording matters more than usual here. "Too hard" does *not* remove the
 * technique - it is in the path because the goal needs it - so the sheet says
 * an easier step goes in front of it instead. "Not for me" does remove it, and
 * regenerates only what came after, so the sheet says completed work is safe.
 * Either message left vague turns a useful control into one nobody dares press.
 */
export function AdaptSheet({ action, technique, onClose, onDone }: AdaptSheetProps) {
  const { api } = useApp();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const copy = action === null ? null : COPY[action];

  const confirm = async () => {
    if (!api || !technique || !action || working) return;

    setWorking(true);
    setError(null);
    try {
      if (action === 'too_hard') await api.markTooHard(technique.id);
      else await api.skipTechnique(technique.id);

      onDone();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught
          : new ApiError('UnexpectedResponse', (caught as Error).message),
      );
    } finally {
      setWorking(false);
    }
  };

  return (
    <ActionSheet
      visible={action !== null}
      onClose={working ? () => undefined : onClose}
      accessibilityLabel={copy?.title ?? 'Change the path'}
    >
      <View style={styles.body}>
        <View style={styles.head}>
          <PipMascot size={44} expression={working ? 'think' : 'idle'} />
          <Text variant="heading" style={styles.title}>
            {copy?.title}
          </Text>
        </View>

        <Text variant="body" tone="textSecondary">
          {copy?.explanation}
        </Text>

        {error ? (
          <Text variant="caption" tone="dangerPressed">
            {error.code === 'NetworkError'
              ? 'You’re offline — the path is unchanged.'
              : `Couldn’t change the path. ${error.message}`}
          </Text>
        ) : null}

        <Button
          label={working ? copy?.working ?? 'Working…' : (copy?.confirm ?? 'Confirm')}
          onPress={confirm}
          disabled={working}
          testID="adapt-confirm"
        />
        <Button label="Never mind" variant="ghost" onPress={onClose} disabled={working} />
      </View>
    </ActionSheet>
  );
}

const COPY: Record<AdaptAction, {
  title: string;
  explanation: string;
  confirm: string;
  working: string;
}> = {
  too_hard: {
    title: 'This is too hard',
    explanation:
      'This technique stays — your goal needs it. Reps will write an easier step and put it in front, so you arrive here ready instead of stuck.',
    confirm: 'Add an easier step',
    working: 'Writing an easier step…',
  },
  skip: {
    title: 'Not for me',
    explanation:
      'This one comes out and Reps rebuilds what came after it, taking a different route to the same goal. Anything you have already mastered stays exactly as it is.',
    confirm: 'Remove and rebuild',
    working: 'Rebuilding the path…',
  },
};

const styles = StyleSheet.create({
  body: { gap: space.md, paddingBottom: space.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { flex: 1, minWidth: 0 },
});
