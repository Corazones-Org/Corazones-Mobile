import { Pressable, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/paths';

// Design system InfoRow: a row of a ListGroup with an icon, a small label and a value.
// Three modes: a plain display, a tappable row with a chevron (`onPress`), and an editable row
// (`onChangeText`) whose value is a text input, so a profile can be edited in place.
export type InfoRowProps = {
  icon?: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
  // Editable mode.
  onChangeText?: (text: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  // Shows an `n/max` counter on multiline rows.
  maxLength?: number;
  // Fixed text before the input, such as "@".
  prefix?: string;
  error?: string;
};

export function InfoRow({
  icon,
  label,
  value = '',
  onPress,
  onChangeText,
  onBlur,
  placeholder,
  keyboardType,
  autoCapitalize,
  multiline,
  maxLength,
  prefix,
  error,
}: InfoRowProps) {
  const { colors, spacing, typography } = useTheme();
  const editable = Boolean(onChangeText);

  const body = (
    <View style={styles.body}>
      <Text style={[typography.small, { color: error ? colors.errorText : colors.textSecondary }]}>{label}</Text>
      {editable ? (
        <View style={styles.inputRow}>
          {prefix ? <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>{prefix}</Text> : null}
          <TextInput
            accessibilityLabel={label}
            value={value}
            onChangeText={onChangeText}
            onBlur={onBlur}
            placeholder={placeholder}
            placeholderTextColor={colors.textPlaceholder}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoCorrect={false}
            multiline={multiline}
            maxLength={maxLength}
            selectionColor={colors.primary}
            style={[
              typography.bodyMedium,
              styles.input,
              { color: colors.textPrimary },
              multiline && styles.multiline,
            ]}
          />
        </View>
      ) : (
        <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>{value}</Text>
      )}
      {editable && multiline && maxLength ? (
        <Text style={[typography.small, styles.counter, { color: colors.textSecondary }]}>
          {value.length}/{maxLength}
        </Text>
      ) : null}
      {error ? (
        <Text accessibilityLiveRegion="polite" style={[typography.small, { color: colors.errorText }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );

  const rowStyle = [
    styles.row,
    { gap: spacing[4], paddingHorizontal: spacing[5], paddingVertical: spacing[4], borderBottomColor: colors.border },
    error && { backgroundColor: colors.errorSoft },
  ];
  const leading = icon ? (
    <View style={styles.icon}>
      <Icon name={icon} size={24} color={error ? colors.errorText : colors.textPrimary} />
    </View>
  ) : null;

  if (onPress && !editable) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value}`}
        onPress={onPress}
        style={({ pressed }) => [rowStyle, pressed && { backgroundColor: colors.surface }]}
      >
        {leading}
        {body}
        <Icon name="chevronRight" size={20} color={colors.textSecondary} />
      </Pressable>
    );
  }

  return (
    <View style={rowStyle}>
      {leading}
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 80,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    width: 32,
    alignItems: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: 0,
    minHeight: 24,
  },
  multiline: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  counter: {
    alignSelf: 'flex-end',
  },
});
