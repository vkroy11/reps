import { resolveApiBaseUrl } from '../lib/api-base-url';
import {
  Button,
  Card,
  Chip,
  PipLogo,
  Skeleton,
  Text,
  color,
  radius,
  space,
  useBreakpoint,
  useReduceMotion,
  type PipExpression,
} from '@reps/ui';
import { today, weekEndingToday, type Technique } from '@reps/core';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PathBoard } from '../features/path/PathBoard';
import { ReflectStep } from '../features/practice/ReflectStep';
import { SessionPlan } from '../features/today/SessionPlan';
import { WeekStrip } from '../features/today/WeekStrip';

const EXPRESSIONS: PipExpression[] = ['idle', 'think', 'cheer', 'struggle'];

/** A week with every day status represented, for the strip. */
const WEEK_FIXTURE = weekEndingToday(
  [0, 1, 2, 4].map((back) => {
    const at = new Date();
    at.setDate(at.getDate() - back);

    return { at: at.toISOString(), minutes: back === 1 ? 6 : 20, xp: 40, pathId: 'path_gallery' };
  }),
  today(),
  { dailyMinutes: 20, daysPerWeek: 5 },
);

/**
 * A seven-technique board with two gates: enough to see the serpentine turn
 * over, one cleared gate, one locked, and a partially practised active disc
 * with a mastery ring.
 */
const BOARD_FIXTURE: Technique[] = [
  ['Open chords', 'completed', 12],
  ['Chord transitions', 'completed', 14],
  ['Strumming patterns', 'completed', 10],
  ['Barre chords', 'active', 18],
  ['Fingerpicking', 'locked', 16],
  ['Playing in time', 'locked', 12],
  ['Your first full song', 'locked', 20],
].map(([title, status, minutes], index) => ({
  id: `tec_gallery_${index}`,
  pathId: 'path_gallery',
  order: index,
  title: title as string,
  whyItMatters: 'Sample data for the design harness.',
  modality: 'watch_and_do',
  practicePrompt: 'Sample rep.',
  estimatedMinutes: minutes as number,
  status: status as Technique['status'],
  confidence: null,
  struggleCount: 0,
  practiceMinutes: status === 'active' ? 7 : 0,
  bridgeForTechniqueId: null,
  searchQueries: [],
  resources: [],
}));
const FORMATS = ['Video', 'Hands-on drills', 'Reading', 'Flashcards'];

/**
 * The design-system harness: every primitive on one screen, so tokens, type
 * and press physics can be checked on a real device. Reachable from Welcome
 * in development only.
 */
export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const { width, isWide } = useBreakpoint();

  const [expression, setExpression] = useState<PipExpression>('idle');
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['Video']);
  const [pressCount, setPressCount] = useState(0);

  const toggleFormat = (formatName: string) =>
    setSelectedFormats((current) =>
      current.includes(formatName)
        ? current.filter((item) => item !== formatName)
        : [...current, formatName],
    );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + space.base, paddingBottom: insets.bottom + space.xxl },
      ]}
    >
      <Text variant="overline" tone="textSecondary" style={styles.label}>
        Week strip
      </Text>
      <Text variant="caption" tone="textSecondary">
        Five practised days, one short, and two rest days on a five-day plan.
      </Text>
      <WeekStrip week={WEEK_FIXTURE} />

      <Text variant="overline" tone="textSecondary" style={styles.label}>
        Session plan
      </Text>
      <SessionPlan modality="watch_and_do" preferredFormats={['video', 'drill']} totalMinutes={15} />

      <Text variant="overline" tone="textSecondary" style={styles.label}>
        Reflect
      </Text>
      <ReflectStep minutes={12} onReflect={() => setPressCount((n) => n + 1)} saving={false} />

      <Text variant="overline" tone="textSecondary" style={styles.label}>
        Path board
      </Text>
      <Text variant="caption" tone="textSecondary">
        Seven techniques, two gates, a mastery ring on the active disc.
      </Text>
      <PathBoard
        techniques={BOARD_FIXTURE}
        goal="play 5 songs at a campfire"
        onSelect={() => setPressCount((n) => n + 1)}
      />

      <View style={styles.hero}>
        <PipLogo size={72} expression={expression} onPress={() => setPressCount((n) => n + 1)} />
        <View style={styles.heroText}>
          <Text variant="title">Reps</Text>
          <Text variant="caption" tone="textSecondary">
            Phase 1 · design system
          </Text>
        </View>
      </View>

      <Text variant="overline" tone="textSecondary" style={styles.label}>
        Mascot · tap Pip to feel the press spring
      </Text>
      <View style={styles.row}>
        {EXPRESSIONS.map((item) => (
          <Chip
            key={item}
            label={item}
            selected={expression === item}
            onPress={() => setExpression(item)}
            testID={`expression-${item}`}
          />
        ))}
      </View>
      <Text variant="caption" tone="textSecondary" style={styles.note}>
        Pressed {pressCount}× · only idle breathes, the rest are momentary states
      </Text>

      <Text variant="overline" tone="textSecondary" style={styles.label}>
        Type scale
      </Text>
      <Card>
        <Text variant="display">Display 32</Text>
        <Text variant="title">Title 24</Text>
        <Text variant="heading">Heading 18</Text>
        <Text variant="body">Body 16 — the readable default for copy and notes.</Text>
        <Text variant="label">Label 15</Text>
        <Text variant="caption" tone="textSecondary">
          Caption 13 · secondary tone, 4.55 contrast
        </Text>
        <Text variant="overline" tone="textSecondary">
          Overline 11
        </Text>
      </Card>

      <Text variant="overline" tone="textSecondary" style={styles.label}>
        Buttons · the 3D edge collapses on press
      </Text>
      <View style={styles.stack}>
        <Button label="Start practice" onPress={() => setPressCount((n) => n + 1)} />
        <Button label="Practise again" variant="secondary" />
        <Button label="Not for me" variant="danger" />
        <Button label="I already have a path" variant="ghost" />
        <Button label="Continue" disabled />
        <View style={styles.triple}>
          <Button label="Again" variant="danger" compact fullWidth={false} style={styles.third} />
          <Button label="Hard" variant="secondary" compact fullWidth={false} style={styles.third} />
          <Button label="Good" compact fullWidth={false} style={styles.third} />
        </View>
      </View>

      <Text variant="overline" tone="textSecondary" style={styles.label}>
        Chips · multi-select
      </Text>
      <View style={styles.row}>
        {FORMATS.map((formatName) => (
          <Chip
            key={formatName}
            label={formatName}
            selected={selectedFormats.includes(formatName)}
            onPress={() => toggleFormat(formatName)}
          />
        ))}
      </View>

      <Text variant="overline" tone="textSecondary" style={styles.label}>
        Card tones
      </Text>
      <View style={styles.stack}>
        <Card>
          <Text variant="heading">Default</Text>
          <Text variant="caption" tone="textSecondary">
            Surfaces, sheets, list rows
          </Text>
        </Card>
        <Card tone="progress">
          <Text variant="heading" tone="progressText">
            Progress
          </Text>
          <Text variant="caption" tone="progressText">
            Completed work and the practice rep
          </Text>
        </Card>
        <Card tone="brand">
          <Text variant="heading" tone="brandPressed">
            Brand
          </Text>
          <Text variant="caption" tone="brandPressed">
            Explaining a modality override
          </Text>
        </Card>
      </View>

      <Text variant="overline" tone="textSecondary" style={styles.label}>
        Skeletons · shape of the answer, not a spinner
      </Text>
      <View style={styles.stack}>
        <Skeleton height={74} />
        <Skeleton height={74} />
        <Skeleton height={20} width="60%" borderRadius={radius.chip} />
      </View>

      <Text variant="overline" tone="textSecondary" style={styles.label}>
        Environment
      </Text>
      <Card>
        <Row label="Platform" value={`${Platform.OS} ${String(Platform.Version ?? '')}`} />
        <Row label="Width" value={`${Math.round(width)}px`} />
        <Row label="Layout" value={isWide ? 'wide · two pane' : 'phone · tabs'} />
        <Row label="Reduce motion" value={reduceMotion ? 'ON — springs disabled' : 'off'} />
        <Row label="API base" value={resolveApiBaseUrl()} />
      </Card>

    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.envRow}>
      <Text variant="caption" tone="textSecondary">
        {label}
      </Text>
      <Text variant="caption" style={styles.envValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surfacePage },
  content: {
    paddingHorizontal: space.base,
    gap: space.sm,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm },
  heroText: { gap: 2 },
  label: { marginTop: space.lg, marginBottom: space.xs },
  note: { marginTop: space.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  triple: { flexDirection: 'row', gap: space.sm },
  stack: { gap: space.md },
  third: { flex: 1 },
  envRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.base,
    paddingVertical: 5,
  },
  // minWidth:0 with flex is what lets a numberOfLines={1} string ellipsise
  // instead of pushing the row wider.
  envValue: { flex: 1, minWidth: 0, textAlign: 'right' },
});
