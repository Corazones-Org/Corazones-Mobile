import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { ToastProvider, useToast } from '../ToastProvider';

function Trigger({ options }: { options: Parameters<ReturnType<typeof useToast>['show']>[0] }) {
  const { show } = useToast();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="abrir" onPress={() => show(options)}>
      <Text>abrir</Text>
    </Pressable>
  );
}

const open = () => fireEvent.press(screen.getByRole('button', { name: 'abrir' }));

describe('ToastProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('muestra el toast que se le pide', async () => {
    await render(
      <ToastProvider>
        <Trigger options={{ tone: 'error', title: 'Falló', message: 'Probá de nuevo.' }} />
      </ToastProvider>
    );
    expect(screen.queryByText('Falló')).toBeNull();

    await open();

    expect(screen.getByText('Falló')).toBeTruthy();
    expect(screen.getByText('Probá de nuevo.')).toBeTruthy();
  });

  it('se cierra solo a los 4 segundos', async () => {
    await render(
      <ToastProvider>
        <Trigger options={{ title: 'Hola' }} />
      </ToastProvider>
    );
    await open();

    await act(async () => jest.advanceTimersByTime(3900));
    expect(screen.getByText('Hola')).toBeTruthy();

    await act(async () => jest.advanceTimersByTime(200));
    expect(screen.queryByText('Hola')).toBeNull();
  });

  it('un toast con acción no se cierra solo', async () => {
    await render(
      <ToastProvider>
        <Trigger options={{ title: 'Con acción', action: 'Reintentar', onAction: jest.fn() }} />
      </ToastProvider>
    );
    await open();

    await act(async () => jest.advanceTimersByTime(30000));

    expect(screen.getByText('Con acción')).toBeTruthy();
  });

  it('un toast nuevo reemplaza al anterior y reinicia el tiempo', async () => {
    function Two() {
      const { show } = useToast();
      return (
        <>
          <Pressable accessibilityRole="button" accessibilityLabel="uno" onPress={() => show({ title: 'Uno' })}>
            <Text>uno</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="dos" onPress={() => show({ title: 'Dos' })}>
            <Text>dos</Text>
          </Pressable>
        </>
      );
    }
    await render(
      <ToastProvider>
        <Two />
      </ToastProvider>
    );

    await fireEvent.press(screen.getByRole('button', { name: 'uno' }));
    await act(async () => jest.advanceTimersByTime(3000));
    await fireEvent.press(screen.getByRole('button', { name: 'dos' }));

    expect(screen.queryByText('Uno')).toBeNull();
    expect(screen.getByText('Dos')).toBeTruthy();
    await act(async () => jest.advanceTimersByTime(3000));
    expect(screen.getByText('Dos')).toBeTruthy();
    await act(async () => jest.advanceTimersByTime(1500));
    expect(screen.queryByText('Dos')).toBeNull();
  });

  it('useToast falla fuera del provider', async () => {
    function Probe() {
      useToast();
      return <Text>ok</Text>;
    }
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(render(<Probe />)).rejects.toThrow('useToast must be used inside a ToastProvider');
  });
});
