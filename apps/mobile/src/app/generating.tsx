import { ApiError, toOnboardingInput } from '@reps/client';
import type { LearningPath } from '@reps/core';
import { Button, Card, PipLogo, Text, color, space } from '@reps/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../providers/app-provider';

/**
 * Phase 2 endpoint. Proves the collected answers assemble into a valid API
 * request and that a real path comes back.
 *
 * Phase 3 replaces this with the staged loader (Plan -> Retrieve -> Rank) and
 * routes onward to Today.
 */
export default function GeneratingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { draft, api } = useApp();

  const [path, setPath] = useState<LearningPath | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  const input = toOnboardingInput(draft);

  const create = async () => {
    if (!api || !input) return;

    setBusy(true);
    setError(null);
    try {
      setPath(await api.createPath(input));
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught
          : new ApiError('UnexpectedResponse', (caught as Error).message),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xl },
      ]}
    >
      <View style={styles.hero}>
        <PipLogo size={96} expression={error ? 'struggle' : busy ? 'think' : 'idle'} />
        <Text variant="title" center>
          {path ? 'Your path is ready' : error ? 'That didn’t come back' : 'Ready to build'}
        </Text>
      </View>

      {!path ? (
        <Card>
          <Text variant="overline" tone="textSecondary">
            Collected answers
          </Text>
          <Row label="Skill" value={draft.skill} />
          <Row label="Goal" value={draft.goal} />
          <Row label="Level" value={draft.level} />
          <Row
            label="Time"
            value={
              draft.dailyMinutes ? `${draft.dailyMinutes} min · ${draft.daysPerWeek} days` : undefined
            }
          />
          <Row label="Formats" value={draft.preferredFormats?.join(', ') || 'no preference'} />
          <Row label="Language" value={draft.language} />
          <Text variant="caption" tone={input ? 'progressText' : 'danger'} style={styles.valid}>
            {input ? 'Valid API request' : 'Incomplete — an answer is still missing'}
          </Text>
        </Card>
      ) : null}

      {error ? (
        <Card>
          <Text variant="body">{error.message}</Text>
          {error.isDegradable ? (
            <Text variant="caption" tone="textSecondary" style={styles.hint}>
              The plan can still be built without videos.
            </Text>
          ) : null}
        </Card>
      ) : null}

      {path ? (
        <Card>
          <Text variant="heading">{path.skill}</Text>
          <Text variant="caption" tone="textSecondary">
            {path.goal} · {path.archetype}
          </Text>
          {path.techniques.map((technique) => (
            <View key={technique.id} style={styles.technique}>
              <Text variant="label">
                {technique.order + 1}. {technique.title}
              </Text>
              <Text variant="caption" tone="textSecondary">
                {technique.modality} · {technique.estimatedMinutes} min · {technique.status} ·{' '}
                {technique.resources.length} resource(s)
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      <View style={styles.actions}>
        {!path ? (
          <Button
            label={busy ? 'Building…' : 'Build my path'}
            onPress={create}
            disabled={busy || !input || !api}
            testID="build-path"
          />
        ) : null}
        <Button label="Back to start" variant="ghost" onPress={() => router.replace('/')} />
      </View>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.row}>
      <Text variant="caption" tone="textSecondary">
        {label}
      </Text>
      <Text variant="caption" style={styles.value} numberOfLines={2}>
        {value ?? '—'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surfacePage },
  content: {
    paddingHorizontal: space.base,
    gap: space.base,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  hero: { alignItems: 'center', gap: space.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.base, paddingVertical: 5 },
  value: { flex: 1, minWidth: 0, textAlign: 'right' },
  valid: { marginTop: space.sm },
  hint: { marginTop: space.xs },
  technique: { marginTop: space.md, gap: 2 },
  actions: { gap: space.sm },
});
