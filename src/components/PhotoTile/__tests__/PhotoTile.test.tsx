import { fireEvent, render } from '@testing-library/react-native';

import '@/i18n';

import { PhotoTile } from '../PhotoTile';

describe('PhotoTile', () => {
  it('muestra la foto', async () => {
    const { getByTestId } = await render(<PhotoTile src="file:///a.webp" alt="Foto 1" />);

    expect(getByTestId('photo-tile-image').props.source).toEqual({ uri: 'file:///a.webp' });
  });

  it('la foto principal lleva la etiqueta Principal', async () => {
    const { getByText, queryByText, rerender } = await render(
      <PhotoTile src="file:///a.webp" main />
    );
    expect(getByText('Principal')).toBeTruthy();

    await rerender(<PhotoTile src="file:///a.webp" />);
    expect(queryByText('Principal')).toBeNull();
  });

  it('permite eliminar la foto', async () => {
    const onRemove = jest.fn();
    const { getByRole } = await render(<PhotoTile src="file:///a.webp" onRemove={onRemove} />);

    await fireEvent.press(getByRole('button', { name: 'Eliminar foto' }));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('con onRemove={false} no muestra el botón de eliminar', async () => {
    const { queryByRole } = await render(<PhotoTile src="file:///a.webp" onRemove={false} />);

    expect(queryByRole('button', { name: 'Eliminar foto' })).toBeNull();
  });

  it('la casilla vacía invita a agregar una foto', async () => {
    const onAdd = jest.fn();
    const { getByRole, getByText } = await render(<PhotoTile add onAdd={onAdd} />);

    expect(getByText('Agregar foto')).toBeTruthy();
    await fireEvent.press(getByRole('button', { name: 'Agregar foto' }));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('permite cambiar el texto de la casilla vacía', async () => {
    const { getByText } = await render(<PhotoTile add label="Sumar foto" />);

    expect(getByText('Sumar foto')).toBeTruthy();
  });

  it('mientras sube muestra un spinner y no deja eliminar', async () => {
    const { getByTestId, queryByRole } = await render(<PhotoTile src="file:///a.webp" loading />);

    expect(getByTestId('photo-tile-spinner')).toBeTruthy();
    expect(queryByRole('button', { name: 'Eliminar foto' })).toBeNull();
  });

  it('si falló la subida muestra el error y permite reintentar o quitar la foto', async () => {
    const onRetry = jest.fn();
    const onRemove = jest.fn();
    const { getByText, getByRole } = await render(
      <PhotoTile src="file:///a.webp" error onRetry={onRetry} onRemove={onRemove} />
    );

    expect(getByText('No se pudo subir')).toBeTruthy();
    await fireEvent.press(getByRole('button', { name: 'Reintentar' }));
    await fireEvent.press(getByRole('button', { name: 'Eliminar foto' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
