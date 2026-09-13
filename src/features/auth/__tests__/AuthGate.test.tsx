import { render, fireEvent } from '@testing-library/react-native';

import '@/i18n';

const mockSignIn = jest.fn();
const mockUseGoogleSignIn = jest.fn();
let mockUseAuth: jest.Mock;

jest.mock('../useGoogleSignIn', () => ({
  useGoogleSignIn: () => mockUseGoogleSignIn(),
}));

jest.mock('../AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../api', () => ({
  signOut: jest.fn(),
}));

import { signOut } from '../api';
import { AuthGate } from '../AuthGate';

describe('AuthGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth = jest.fn();
    mockSignIn.mockResolvedValue({ error: null });
    mockUseGoogleSignIn.mockReturnValue({ signIn: mockSignIn });
  });

  it('muestra un loading mientras status es loading', async () => {
    mockUseAuth.mockReturnValue({ status: 'loading', session: null });

    const { getByText } = await render(<AuthGate />);

    expect(getByText('Cargando...')).toBeTruthy();
  });

  it('muestra el botón de login con Google cuando no hay sesión', async () => {
    mockUseAuth.mockReturnValue({ status: 'signedOut', session: null });

    const { getByText } = await render(<AuthGate />);

    fireEvent.press(getByText('Ingresar con Google'));

    expect(mockSignIn).toHaveBeenCalled();
  });

  it('muestra el botón de logout cuando hay sesión', async () => {
    mockUseAuth.mockReturnValue({ status: 'signedIn', session: { access_token: 'abc' } });

    const { getByText } = await render(<AuthGate />);

    fireEvent.press(getByText('Cerrar sesión'));

    expect(signOut).toHaveBeenCalled();
  });
});
