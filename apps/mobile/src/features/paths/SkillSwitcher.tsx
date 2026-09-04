import { isPathComplete, pathProgress } from '@reps/client';
import type { LearningPathSummary } from '@reps/core';
import { ActionSheet, ProgressRing, Text, color, radius, space } from '@reps/ui';
import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import Plus from 'lucide-react-native/icons/plus';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

export interface SkillSwitcherProps {
  paths: LearningPathSummary[];
  focusedId: string | null;
  onSelect: (pathId: string) => void;
  onAddPath: () => void;
}

/**
 * The skill name, as a control rather than a label.
 *
 * The Path tab drew whichever hobby Today happened to be focused on, with no
 * way to change it from here - so switching meant going back to Today, swiping,
 * and returning. A chevron on the title is the smallest thing that fixes that,
 * and it puts the affordance exactly where someone looks to check which hobby
 * they are on.
 *
 * A sheet rather than the pager Today uses. This screen has one board filling
 * it; paging boards sideways would fight the vertical scroll they live in.
 */
export function SkillSwitcher({ paths, focusedId, onSelect, onAddPath }: SkillSwitcherProps) {
  const [open, setOpen] = useState(false);
  const focused = paths.find((path) => path.id === focusedId) ?? null;

  // Nothing to switch between, so the title stays a title.
  if (paths.length < 2) {
    return (
      <Text variant="title" style={styles.plainTitle} numberOfLines={2}>
        {focused?.skill ?? 'Your path'}
      </Text>
    );
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${focused?.skill ?? 'Your path'}. Switch hobby.`}
        onPress={() => setOpen(true)}
        style={styles.trigger}
        hitSlop={8}
        testID="switch-skill"
      >
        <Text variant="title" style={styles.title} numberOfLines={2}>
          {focused?.skill ?? 'Your path'}
        </Text>
        <View style={styles.chevron}>
          <ChevronDown size={18} color={color.brandPressed} strokeWidth={2.6} />
        </View>
      </Pressable>

      <ActionSheet visible={open} onClose={() => setOpen(false)} accessibilityLabel="Switch hobby">
        <ScrollView contentContainerStyle={styles.list}>
          {paths.map((path) => {
            const done = isPathComplete(path);
            const current = path.id === focusedId;

            return (
              <Pressable
                key={path.id}
                accessibilityRole="button"
                accessibilityState={{ selected: current }}
                accessibilityLabel={`${path.skill}, ${path.completedCount} of ${path.techniqueCount} levels${done ? ', complete' : ''}`}
                onPress={() => {
                  setOpen(false);
                  if (!current) onSelect(path.id);
                }}
                style={[styles.row, current && styles.rowCurrent]}
                testID={`switch-to-${path.id}`}
              >
                {/* The ring is the one thing worth showing per hobby here:
                    which of them you are actually getting somewhere with. */}
                <ProgressRing
                  value={pathProgress(path)}
                  size={38}
                  strokeWidth={3.5}
                  tint={done ? color.progress : color.brand}
                  track={color.surfaceLocked}
                />

                <View style={styles.copy}>
                  <Text variant="label" numberOfLines={1}>
                    {path.skill}
                  </Text>
                  <Text variant="caption" tone="textSecondary" numberOfLines={1}>
                    {done
                      ? 'Complete'
                      : `${path.completedCount} of ${path.techniqueCount} levels · ${path.xp} XP`}
                  </Text>
                </View>

                {current ? <Check size={19} color={color.brandPressed} strokeWidth={2.6} /> : null}
              </Pressable>
            );
          })}

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setOpen(false);
              onAddPath();
            }}
            style={styles.addRow}
            testID="switch-add-path"
          >
            <View style={styles.addGlyph}>
              <Plus size={19} color={color.brand} strokeWidth={2.6} />
            </View>
            <Text variant="label" style={styles.addLabel}>
              Start another hobby
            </Text>
          </Pressable>
        </ScrollView>
      </ActionSheet>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  plainTitle: { flex: 1, minWidth: 0 },
  title: { flexShrink: 1, minWidth: 0 },
  chevron: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: color.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { gap: space.sm, paddingBottom: space.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.input + 2,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.surfaceCard,
  },
  rowCurrent: { borderColor: color.brand, backgroundColor: color.brandSoft },
  copy: { flex: 1, minWidth: 0 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.input + 2,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: color.borderDefault,
  },
  addGlyph: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: color.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: { flex: 1, minWidth: 0, color: color.brandPressed },
});
