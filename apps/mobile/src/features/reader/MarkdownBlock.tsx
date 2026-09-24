import { Text, color, font, radius, space, typeScale } from '@reps/ui';
import { Image } from 'expo-image';
import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { ArticleBlock } from './blocks';

/**
 * One article block: prose with bold/italic/code, an IDE-styled snippet,
 * a mermaid diagram, a heading, or an extracted image.
 */
export function MarkdownBlock({ block }: { block: ArticleBlock }) {
  if (block.type === 'image') {
    return (
      <View style={styles.figure}>
        <Image
          source={{ uri: block.url }}
          style={styles.image}
          contentFit="contain"
          accessibilityLabel={block.alt || 'Illustration'}
          testID="article-image"
        />
        {block.alt ? (
          <Text variant="caption" tone="textSecondary" center>
            {block.alt}
          </Text>
        ) : null}
      </View>
    );
  }

  if (block.type === 'diagram') {
    return (
      <View style={styles.figure}>
        <Image
          source={{ uri: mermaidImageUrl(block.source) }}
          style={styles.diagram}
          contentFit="contain"
          accessibilityLabel="Flow diagram"
          testID="article-diagram"
        />
      </View>
    );
  }

  if (block.type === 'code') {
    return <CodeBlock language={block.language} code={block.code} />;
  }

  if (block.type === 'heading') {
    return (
      <Text variant={block.level === 1 ? 'title' : 'heading'}>{inline(block.markdown)}</Text>
    );
  }

  return <Text variant="body">{inline(block.markdown)}</Text>;
}

/** Strip markers for notes and accessibility, leaving the words. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function mermaidImageUrl(source: string): string {
  return `https://mermaid.ink/img/${utf8ToBase64(source.trim())}`;
}

const INLINE = /(`[^`]+`|\*\*[^*]+?\*\*|\*[^*]+?\*)/g;

function inline(markdown: string): ReactNode[] {
  return markdown.split(INLINE).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <Text key={index} variant="body" style={styles.bold}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <Text key={index} style={styles.inlineCode}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2 && !part.startsWith('**')) {
      return (
        <Text key={index} variant="body" style={styles.emphasis}>
          {part.slice(1, -1)}
        </Text>
      );
    }

    return part;
  });
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  return (
    <View style={styles.ide} testID="article-code">
      <View style={styles.ideBar}>
        <View style={[styles.traffic, { backgroundColor: '#FF5F56' }]} />
        <View style={[styles.traffic, { backgroundColor: '#FFBD2E' }]} />
        <View style={[styles.traffic, { backgroundColor: '#27C93F' }]} />
        <Text style={styles.ideLang}>{language}</Text>
      </View>
      <ScrollView horizontal bounces={false} showsHorizontalScrollIndicator={false}>
        <Text style={styles.ideCode}>{code}</Text>
      </ScrollView>
    </View>
  );
}

function utf8ToBase64(value: string): string {
  const encode = globalThis.btoa;
  if (typeof encode === 'function') {
    return encode(unescape(encodeURIComponent(value)));
  }

  return Buffer.from(value, 'utf8').toString('base64');
}

const MONO = 'Menlo';

const styles = StyleSheet.create({
  figure: { gap: space.sm },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.card,
    backgroundColor: color.surfaceLocked,
  },
  diagram: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: radius.card,
    backgroundColor: color.surfaceCard,
    borderWidth: 1,
    borderColor: color.borderDefault,
  },
  bold: {
    fontFamily: font.extrabold,
    fontSize: typeScale.body.fontSize,
    lineHeight: typeScale.body.lineHeight,
    color: color.textPrimary,
  },
  emphasis: {
    fontFamily: font.semibold,
    fontSize: typeScale.body.fontSize,
    lineHeight: typeScale.body.lineHeight,
    color: color.textPrimary,
  },
  inlineCode: {
    fontFamily: MONO,
    fontSize: 14,
    lineHeight: 20,
    color: '#DB2777',
    backgroundColor: color.surfaceSunken,
    borderRadius: 4,
  },
  ide: {
    backgroundColor: '#0B1220',
    borderRadius: radius.card,
    overflow: 'hidden',
    paddingBottom: space.md,
  },
  ideBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    backgroundColor: '#111827',
  },
  traffic: { width: 10, height: 10, borderRadius: 5 },
  ideLang: {
    marginLeft: space.sm,
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: font.semibold,
    textTransform: 'lowercase',
  },
  ideCode: {
    fontFamily: MONO,
    fontSize: 13,
    lineHeight: 20,
    color: '#E2E8F0',
    paddingHorizontal: space.md,
    paddingTop: space.sm,
  },
});
