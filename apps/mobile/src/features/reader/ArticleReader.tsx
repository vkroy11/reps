import type { NoteAnchor } from '@reps/core';
import { Button, Text, color, radius, space } from '@reps/ui';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { blocksOf, type ArticleBlock } from './blocks';
import { MarkdownBlock, plainText } from './MarkdownBlock';

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
 * The native article. Each block is tappable so a note can point at a place
 * in the lesson the same way a timestamp points at a place in a video.
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
  const blocks = blocksOf(body);
  const scrollRef = useRef<ScrollView>(null);
  const yByIndex = useRef<Record<number, number>>({});

  useEffect(() => {
    if (jumpTo === null) return;
    const y = yByIndex.current[jumpTo];
    if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true });
  }, [jumpTo]);

  const selected = selectedIndex !== null ? (blocks[selectedIndex] ?? null) : null;

  return (
    <View style={styles.wrap}>
      <Text variant="heading">{title}</Text>
      <Text variant="caption" tone="textSecondary" style={styles.source}>
        {source}
      </Text>

      {blocks.length === 0 ? (
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
          {blocks.map((block, index) => {
            const isSelected = selectedIndex === index;

            return (
              <Pressable
                key={`${index}-${quoteFrom(block).slice(0, 24)}`}
                onPress={() => onSelect(isSelected ? null : index)}
                onLayout={(event) => {
                  yByIndex.current[index] = event.nativeEvent.layout.y;
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Paragraph ${index + 1}. ${isSelected ? 'Selected.' : 'Tap to highlight.'}`}
                testID={`article-p-${index}`}
                style={[styles.paragraph, isSelected && styles.paragraphSelected]}
              >
                <MarkdownBlock block={block} />
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {selected ? (
        <Button
          label="Note this paragraph"
          variant="secondary"
          onPress={() =>
            onAddNote({
              timestampSec: selectedIndex ?? 0,
              anchor: {
                kind: 'highlight',
                start: selectedIndex ?? 0,
                quote: plainText(quoteFrom(selected)).slice(0, 500),
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

function quoteFrom(block: ArticleBlock): string {
  if (block.type === 'text' || block.type === 'heading') return block.markdown;
  if (block.type === 'code') return block.code;
  if (block.type === 'diagram') return block.source;
  return block.alt || block.url;
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  source: { marginBottom: space.xs },
  empty: { marginVertical: space.md },
  scroll: { maxHeight: 560 },
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
