import fs from 'fs';
import path from 'path';

import { radius, size, spacing, themes, typography } from '../tokens';

const { generate } = require('../../../scripts/generate-theme');

const root = path.resolve(__dirname, '../../..');

describe('design tokens', () => {
  it('exposes the brand colors per theme', () => {
    expect(themes.light.colors.primary).toBe('#ff2d7a');
    expect(themes.light.colors.background).toBe('#fff7f9');
    expect(themes.dark.colors.background).toBe('#160b11');
    expect(themes.light.colors.textPrimary).not.toBe(themes.dark.colors.textPrimary);
  });

  it('resolves color aliases to their value in the same theme', () => {
    expect(themes.light.colors.gradPrimaryStart).toBe(themes.light.colors.primary);
    expect(themes.dark.colors.gradSoftEnd).toBe(themes.dark.colors.light);
  });

  it('exposes spacing, radius and size scales as numbers', () => {
    expect(spacing[4]).toBe(16);
    expect(radius.lg).toBe(16);
    expect(radius.pill).toBe(999);
    expect(size.controlLg).toBe(52);
  });

  it('maps type styles to the Poppins family of their weight', () => {
    expect(typography.h2).toMatchObject({
      fontFamily: 'Poppins_700Bold',
      fontSize: 24,
      lineHeight: 32,
    });
    expect(typography.body.fontFamily).toBe('Poppins_400Regular');
    expect(typography.button.fontFamily).toBe('Poppins_600SemiBold');
    expect(typography.bodyMedium.fontFamily).toBe('Poppins_500Medium');
  });

  it('turns em letter spacing into pixels', () => {
    expect(typography.wordmark.letterSpacing).toBeCloseTo(-0.48);
  });

  it('turns CSS shadows into React Native shadow props', () => {
    expect(themes.light.shadow.button).toMatchObject({
      shadowColor: '#ff2d7a',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 9,
    });
    expect(themes.dark.shadow.card.shadowColor).toBe('#000000');
  });

  it('includes the liquid glass tokens used by the floating tab bar', () => {
    expect(themes.light.colors.liquidFill).toBe('rgba(255, 255, 255, 0.58)');
    expect(themes.light.colors.liquidLens).toBe('rgba(255, 45, 122, 0.14)');
    expect(themes.dark.colors.liquidFill).toBe('rgba(42, 24, 34, 0.55)');
    expect(themes.light.shadow.liquid).toMatchObject({
      shadowColor: '#ff2d7a',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 15,
    });
  });

  it('keeps src/theme/tokens.ts in sync with design/tokens.json (run `npm run theme`)', () => {
    const json = JSON.parse(fs.readFileSync(path.join(root, 'design/tokens.json'), 'utf8'));
    const generated = fs.readFileSync(path.join(root, 'src/theme/tokens.ts'), 'utf8');

    expect(generate(json)).toBe(generated);
  });
});
