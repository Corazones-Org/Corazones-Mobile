import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ListGroup } from '../ListGroup';

describe('ListGroup', () => {
  it('muestra sus filas', async () => {
    const { getByText } = await render(
      <ListGroup>
        <Text>uno</Text>
        <Text>dos</Text>
      </ListGroup>
    );

    expect(getByText('uno')).toBeTruthy();
    expect(getByText('dos')).toBeTruthy();
  });
});
