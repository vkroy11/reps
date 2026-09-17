import type { NoteAnchor, Resource } from '@reps/core';
import { Text, color, radius, space } from '@reps/ui';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeVideoPlayer } from '../player/SafeVideoPlayer';
import { ArticleReader } from './ArticleReader';
import { OriginalSheet } from './OriginalSheet';

export interface LearnNoteDraft {
  resourceId: string;
  timestampSec: number | null;
  anchor: NoteAnchor | null;
  stamp: string | null;
}

export interface LearnPanelProps {
  resources: Resource[];
  onAddNote: (draft: LearnNoteDraft) => void;
  onRegisterPositionReader?: (read: () => number) => void;
  onRegisterSeek?: (seek: (seconds: number) => void) => void;
  jumpTo: number | null;
}

function labelFor(resource: Resource): string {
  if (resource.format === 'video') return 'Video';
  if (resource.format === 'ai_lesson') return 'Lesson';
  return 'Article';
}

/**
 * The Learn block on a technique: one resource on screen, the others a tap away.
 *
 * Video stays first in the list so older clients that only play resources[0]
 * still get a demo. This panel is what lets a current client actually use the
 * article sitting next to it.
 */
export function LearnPanel({
  resources,
  onAddNote,
  onRegisterPositionReader,
  onRegisterSeek,
  jumpTo,
}: LearnPanelProps) {
  const [selectedId, setSelectedId] = useState(resources[0]?.id ?? null);
  const [paragraph, setParagraph] = useState<number | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);

  const selected = resources.find((resource) => resource.id === selectedId) ?? resources[0] ?? null;

  useEffect(() => {
    if (selectedId && resources.some((resource) => resource.id === selectedId)) return;
    setSelectedId(resources[0]?.id ?? null);
  }, [resources, selectedId]);

  if (!selected) return null;

  const readable = selected.format === 'article' || selected.format === 'ai_lesson';

  return (
    <View style={styles.wrap}>
      {resources.length > 1 ? (
        <View style={styles.switcher}>
          {resources.map((resource) => {
            const active = resource.id === selected.id;

            return (
              <Pressable
                key={resource.id}
                onPress={() => {
                  setSelectedId(resource.id);
                  setParagraph(null);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                testID={`learn-${resource.format}`}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text variant="caption" tone={active ? 'textOnBrand' : 'textSecondary'}>
                  {labelFor(resource)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {readable ? (
        <ArticleReader
          title={selected.title}
          body={selected.body ?? ''}
          source={selected.source}
          url={selected.url}
          selectedIndex={paragraph}
          onSelect={setParagraph}
          onAddNote={({ timestampSec, anchor }) =>
            onAddNote({
              resourceId: selected.id,
              timestampSec,
              anchor,
              stamp: anchor.quote ?? `¶${timestampSec + 1}`,
            })
          }
          onOpenOriginal={() => selected.url && setOriginalUrl(selected.url)}
          jumpTo={jumpTo}
        />
      ) : (
        <>
          <SafeVideoPlayer
            resource={selected}
            onRegisterPositionReader={onRegisterPositionReader}
            onRegisterSeek={onRegisterSeek}
          />
          <Text variant="label" numberOfLines={2} style={styles.resourceTitle}>
            {selected.title}
          </Text>
          <Text variant="caption" tone="textSecondary">
            {selected.source}
          </Text>
        </>
      )}

      <Text variant="caption" tone="textSecondary" style={styles.reason}>
        {selected.selectionReason}
      </Text>

      <OriginalSheet
        url={originalUrl}
        title={selected.title}
        onClose={() => setOriginalUrl(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  switcher: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: color.surfaceLocked,
  },
  chipActive: { backgroundColor: color.brand },
  resourceTitle: { marginTop: space.sm },
  reason: { marginTop: space.xs, marginBottom: space.sm },
});
