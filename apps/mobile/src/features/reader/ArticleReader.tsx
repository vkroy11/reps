import type { NoteAnchor } from '@reps/core';
import { Button, Text, color, radius, space } from '@reps/ui';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { paragraphsOf } from './paragraphs';

export interface ArticleReaderProps {
  title: string;
  body: string;
  source: string;
  url: string | null;
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  onAddNote: (anchor: { timestampSec: number; anchor: NoteAnchor }) => void;
  onOpenOriginal: () => void;
  /** Paragraph to scroll into view, from a note tap. */
  jumpTo: number | null;
}

/**
 * The native article. Paragraphs are the unit of selection so a note can point
 * at a place in the text the same way a timestamp points at a place in a video.
 */
export function ArticleReader({
  title,
  body,
  source,
  url,
  selectedIndex,
  onSelect,
  onAddNote,
  onOpenOriginal,
  jumpTo,
}: ArticleReaderProps) {
  const paragraphs = paragraphsOf(body);
  const scrollRef = useRef<ScrollView>(null);
  const yByIndex = useRef<Record<number, number>>({});

  useEffect(() => {
    if (jumpTo === null) return;
    const y = yByIndex.current[jumpTo];
    if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true });
  }, [jumpTo]);

  return (
    <View style={styles.wrap}>
      <Text variant="heading">{title}</Text>
      <Text variant="caption" tone="textSecondary" style={styles.source}>
        {source}
      </Text>

      {paragraphs.length === 0 ? (
        <Text variant="body" tone="textSecondary" style={styles.empty}>
          The extracted text did not come through. The original page is still available.
        </Text>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          nestedScrollEnabled
        >
          {paragraphs.map((paragraph, index) => {
            const selected = selectedIndex === index;

            return (
              <Pressable
                key={`${index}-${paragraph.slice(0, 24)}`}
                onPress={() => onSelect(selected ? null : index)}
                onLayout={(event) => {
                  yByIndex.current[index] = event.nativeEvent.layout.y;
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Paragraph ${index + 1}. ${selected ? 'Selected.' : 'Tap to highlight.'}`}
                testID={`article-p-${index}`}
                style={[styles.paragraph, selected && styles.paragraphSelected]}
              >
                <Text variant="body">{paragraph}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {selectedIndex !== null && paragraphs[selectedIndex] ? (
        <Button
          label="Note this paragraph"
          variant="secondary"
          onPress={() =>
            onAddNote({
              timestampSec: selectedIndex,
              anchor: {
                kind: 'highlight',
                start: selectedIndex,
                quote: paragraphs[selectedIndex]!.slice(0, 500),
              },
            })
          }
          testID="note-paragraph"
        />
      ) : null}

      {url ? (
        <Button
          label={`Original on ${source}`}
          variant="ghost"
          onPress={onOpenOriginal}
          testID="open-original"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  source: { marginBottom: space.xs },
  empty: { marginVertical: space.md },
  scroll: { maxHeight: 420 },
  scrollContent: { gap: space.sm, paddingBottom: space.sm },
  paragraph: {
    padding: space.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  paragraphSelected: {
    backgroundColor: color.brandSoft,
    borderColor: color.brand,
  },
});
