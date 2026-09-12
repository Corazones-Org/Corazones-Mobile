import { render } from '@testing-library/react-native';

import App from './App';

test('levanta la app y muestra Corazones', async () => {
  const { getByText } = await render(<App />);

  expect(getByText('Corazones')).toBeTruthy();
});
