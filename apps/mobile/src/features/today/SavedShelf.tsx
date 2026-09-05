import type { ContentFormat, LearningPath, Resource } from '@reps/core';
import { Text, color, radius, space } from '@reps/ui';
import BookOpen from 'lucide-react-native/icons/book-open';
import FileText from 'lucide-react-native/icons/file-text';
import Layers from 'lucide-react-native/icons/layers';
import Lock from 'lucide-react-native/icons/lock';
import Play from 'lucide-react-native/icons/play';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

const GLYPH: Record<ContentFormat, typeof Play> = {
  video: Play,
  article: FileText,
  ai_lesson: BookOpen,
  flashcards: Layers,
  drill: BookOpen,
};

const KIND: Record<ContentFormat, string> = {
  video: 'Video',
  article: 'Article',
  ai_lesson: 'Micro-lesson',
  flashcards: 'Cards',
  drill: 'Drill',
};

export interface SavedItem {
  resource: Resource;
  techniqueId: string;
  techniqueTitle: string;
  /** Still behind a gate. Listed, but not openable. */
  locked: boolean;
  /** What has to be finished first, for the message when it is tapped. */
  blockedBy: string | null;
}

/**
 * What the learner has queued up but not finished.
 *
 * **Why this list is exactly right without any "save" button.** Resources are
 * curated when a technique is first opened, not when the path is built - so a
 * resource existing already *means* the learner went and looked at that
 * technique. Filtering those down to the ones whose technique is unfinished
 * gives "things you started and left", which is what a saved shelf is for.
 */
export function savedItems(path: LearningPath, limit: number): SavedItem[] {
  const items: SavedItem[] = [];

  const active = path.techniques.find((technique) => technique.status === 'active') ?? null;

  for (const technique of path.techniques) {
    if (technique.status === 'completed' || technique.status === 'skipped') continue;

    for (const resource of technique.resources) {
      items.push({
        resource,
        techniqueId: technique.id,
        techniqueTitle: technique.title,
        /*
          Locked techniques stay on the shelf deliberately - seeing what is
          coming is the point of a queue - but they are not a way past the
          gate. Curation runs on first open, so a locked technique can have
          videos the learner has not earned yet.
        */
        locked: technique.status === 'locked',
        blockedBy: technique.status === 'locked' ? (active?.title ?? null) : null,
      });
    }
  }

  // Active technique first, then in path order - which is the order the
  // learner will actually reach them in.
  const activeId = path.techniques.find((technique) => technique.status === 'active')?.id;

  return items
    .sort(
      (left, right) =>
        Number(right.techniqueId === activeId) - Number(left.techniqueId === activeId),
    )
    .slice(0, limit);
}

export interface SavedShelfProps {
  items: SavedItem[];
  onOpen: (item: SavedItem) => void;
}

export function SavedShelf({ items, onOpen }: SavedShelfProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.shelf}
    >
      {items.map((item) => {
        const Glyph = GLYPH[item.resource.format];

        return (
          <Pressable
            key={item.resource.id}
            accessibilityRole="button"
            accessibilityLabel={
              item.locked
                ? `Locked: ${item.resource.title}, from ${item.techniqueTitle}.`
                : `${KIND[item.resource.format]}: ${item.resource.title}. From ${item.techniqueTitle}.`
            }
            onPress={() => onOpen(item)}
            style={styles.card}
            testID={`saved-${item.resource.id}`}
          >
            {/*
              The real thumbnail when we have one. The dark plate behind it is
              not a fallback colour - it is what a 16:9 image looks like while
              it loads, and it stops the shelf flashing white.
            */}
            <View style={styles.thumb}>
              {item.locked ? (
                <View style={styles.lockVeil}>
                  <Lock size={22} color={color.textOnBrand} strokeWidth={2.4} />
                </View>
              ) : null}
              {item.resource.thumbnailUrl ? (
                <Image
                  source={{ uri: item.resource.thumbnailUrl }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <Glyph size={24} color={color.textOnBrand} strokeWidth={2.2} />
              )}
            </View>
            <View style={styles.body}>
              <Text variant="caption" numberOfLines={2} style={styles.title}>
                {item.resource.title}
              </Text>
              <Text variant="overline" tone="textSecondary" style={styles.meta} numberOfLines={1}>
                {metaLine(item)}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** "Paul Davids · 13:04", falling back to the kind when there is no source. */
function metaLine(item: SavedItem): string {
  const { format, source, durationSec } = item.resource;
  const parts = [source || KIND[format], durationSec ? runtime(durationSec) : null];

  return parts.filter((part): part is string => Boolean(part)).join(' · ');
}

function runtime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = `${seconds % 60}`.padStart(2, '0');

  return `${minutes}:${rest}`;
}

const styles = StyleSheet.create({
  shelf: { gap: space.md, paddingHorizontal: space.base, paddingBottom: space.xs },
  card: {
    width: 168,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.surfaceCard,
    overflow: 'hidden',
  },
  thumb: {
    height: 82,
    /* Deliberately outside the token set: this is a photographic backing
       plate, not a surface, and every surface token is near-white. */
    backgroundColor: '#0B1220',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Over the thumbnail, so a locked item reads as locked before it is tapped. */
  lockVeil: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 18, 32, 0.62)',
  },
  body: { paddingHorizontal: space.md, paddingTop: space.md - 1, paddingBottom: space.md + 1 },
  title: { lineHeight: 18 },
  meta: { marginTop: space.xs, letterSpacing: 0.4 },
});
