import { render } from '@testing-library/react-native';

import { Icon } from '../Icon';
import { iconNames } from '../paths';

describe('Icon', () => {
  it('has the design system icon set', () => {
    expect(iconNames.length).toBeGreaterThanOrEqual(60);
    expect(iconNames).toEqual(expect.arrayContaining(['arrowRight', 'heart', 'venus', 'calendar']));
  });

  it('renders every icon without crashing', async () => {
    for (const name of iconNames) {
      const { getByTestId, unmount } = await render(<Icon name={name} />);
      expect(getByTestId(`icon-${name}`, { hidden: true })).toBeTruthy();
      await unmount();
    }
  });

  it('is hidden from screen readers unless it has a label', async () => {
    const { getByTestId } = await render(<Icon name="heart" />);

    expect(getByTestId('icon-heart', { hidden: true }).props.accessibilityElementsHidden).toBe(true);
  });

  it('exposes its label as an image when given one', async () => {
    const { getByLabelText } = await render(<Icon name="heart" label="Me gusta" />);

    expect(getByLabelText('Me gusta')).toBeTruthy();
  });
});
