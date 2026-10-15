import { fireEvent, render } from '@testing-library/react-native';

import '@/i18n';

jest.mock('../api', () => ({
  signOut: jest.fn(),
}));

import { signOut } from '../api';
import { SignOutButton } from '../SignOutButton';

describe('SignOutButton', () => {
  it('cierra sesión al presionar el botón', async () => {
    const { getByText } = await render(<SignOutButton />);

    await fireEvent.press(getByText('Cerrar sesión'));

    expect(signOut).toHaveBeenCalled();
  });
});
