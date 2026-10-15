import { fireEvent, render } from '@testing-library/react-native';

import '@/i18n';

import { GenderSeekingPicker } from '../GenderSeekingPicker';

const catalogs = {
  genders: [
    { id: 1, code: 'male' },
    { id: 2, code: 'female' },
    { id: 3, code: 'other' },
  ],
  partnerPreferences: [
    { id: 1, code: 'men' },
    { id: 2, code: 'women' },
    { id: 3, code: 'everyone' },
  ],
};

function setup(props: Partial<Parameters<typeof GenderSeekingPicker>[0]> = {}) {
  const onGenderChange = jest.fn();
  const onSeekingChange = jest.fn();
  const view = render(
    <GenderSeekingPicker
      catalogs={catalogs}
      gender="female"
      seeking="men"
      onGenderChange={onGenderChange}
      onSeekingChange={onSeekingChange}
      {...props}
    />
  );
  return { view, onGenderChange, onSeekingChange };
}

describe('GenderSeekingPicker', () => {
  it('muestra las opciones y marca las elegidas', async () => {
    const { view } = setup();
    const { getByRole } = await view;

    expect(getByRole('radio', { name: 'Mujer' }).props.accessibilityState.checked).toBe(true);
    expect(getByRole('radio', { name: 'Hombre' }).props.accessibilityState.checked).toBe(false);
    expect(getByRole('radio', { name: 'Hombres' }).props.accessibilityState.checked).toBe(true);
    expect(getByRole('radio', { name: 'Todos' }).props.accessibilityState.checked).toBe(false);
  });

  it('avisa el código elegido', async () => {
    const { view, onGenderChange, onSeekingChange } = setup();
    const { getByRole } = await view;

    await fireEvent.press(getByRole('radio', { name: 'Otro' }));
    await fireEvent.press(getByRole('radio', { name: 'Todos' }));

    expect(onGenderChange).toHaveBeenCalledWith('other');
    expect(onSeekingChange).toHaveBeenCalledWith('everyone');
  });

  it('solo muestra las opciones que existen en los catálogos', async () => {
    const { view } = setup({
      catalogs: { genders: [{ id: 2, code: 'female' }], partnerPreferences: [{ id: 3, code: 'everyone' }] },
    });
    const { queryByRole } = await view;

    expect(queryByRole('radio', { name: 'Mujer' })).toBeTruthy();
    expect(queryByRole('radio', { name: 'Hombre' })).toBeNull();
    expect(queryByRole('radio', { name: 'Mujeres' })).toBeNull();
  });
});
