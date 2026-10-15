import { fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

import { themes } from '@/theme/tokens';
import { LiquidTabBar } from '../LiquidTabBar';
import { useLiquidTabBarClearance } from '../clearance';

const items = [
  { key: 'inicio', label: 'Inicio', icon: 'home' as const },
  { key: 'perfil', label: 'Perfil', icon: 'user' as const },
];

describe('LiquidTabBar', () => {
  it('es una barra de pestañas accesible con nombre por defecto', async () => {
    await render(<LiquidTabBar items={items} active="inicio" />);

    expect(screen.getByTestId('liquid-tab-bar').props.accessibilityRole).toBe('tablist');
    expect(screen.getByLabelText('Navegación principal')).toBeTruthy();
  });

  it('permite cambiar el nombre accesible de la barra', async () => {
    await render(<LiquidTabBar items={items} active="inicio" label="Menú" />);

    expect(screen.getByLabelText('Menú')).toBeTruthy();
    expect(screen.queryByLabelText('Navegación principal')).toBeNull();
  });

  it('muestra una pestaña por item con su ícono y etiqueta', async () => {
    await render(<LiquidTabBar items={items} active="inicio" />);

    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByText('Inicio')).toBeTruthy();
    expect(screen.getByText('Perfil')).toBeTruthy();
    expect(screen.getByTestId('icon-home', { hidden: true })).toBeTruthy();
    expect(screen.getByTestId('icon-user', { hidden: true })).toBeTruthy();
  });

  it('marca como seleccionada solo la pestaña activa', async () => {
    const { rerender } = await render(<LiquidTabBar items={items} active="inicio" />);
    expect(screen.getByRole('tab', { name: 'Inicio', selected: true })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Perfil', selected: false })).toBeTruthy();

    await rerender(<LiquidTabBar items={items} active="perfil" />);
    expect(screen.getByRole('tab', { name: 'Perfil', selected: true })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Inicio', selected: false })).toBeTruthy();
  });

  it('la pestaña activa lleva el ícono lleno y la etiqueta en rosa semibold', async () => {
    await render(<LiquidTabBar items={items} active="inicio" />);

    expect(screen.getByText('Inicio')).toHaveStyle({
      color: themes.light.colors.primaryText,
      fontFamily: 'Poppins_600SemiBold',
    });
    expect(screen.getByText('Perfil')).toHaveStyle({
      color: themes.light.colors.textPrimary,
      fontFamily: 'Poppins_500Medium',
    });
    expect(screen.getByTestId('icon-home', { hidden: true }).props.stroke).toBe(
      themes.light.colors.primary
    );
    expect(screen.getByTestId('icon-user', { hidden: true }).props.stroke).toBe(
      themes.light.colors.textPrimary
    );
  });

  it('llama a onChange con la key de la pestaña tocada', async () => {
    const onChange = jest.fn();
    await render(<LiquidTabBar items={items} active="inicio" onChange={onChange} />);

    await fireEvent.press(screen.getByRole('tab', { name: 'Perfil' }));

    expect(onChange).toHaveBeenCalledWith('perfil');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('tocar la pestaña que ya está activa no hace nada', async () => {
    const onChange = jest.fn();
    await render(<LiquidTabBar items={items} active="inicio" onChange={onChange} />);

    await fireEvent.press(screen.getByRole('tab', { name: 'Inicio' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('con labels={false} es una cápsula de íconos y las etiquetas pasan a ser el nombre accesible', async () => {
    await render(<LiquidTabBar items={items} active="inicio" labels={false} />);

    expect(screen.queryByText('Inicio')).toBeNull();
    expect(screen.getByRole('tab', { name: 'Inicio' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Perfil' })).toBeTruthy();
  });

  it('muestra el contador de una pestaña', async () => {
    await render(
      <LiquidTabBar
        items={[{ ...items[0], badge: 3 }, items[1]]}
        active="inicio"
      />
    );

    expect(screen.getByText('3')).toBeTruthy();
  });

  it('acepta de 2 a 5 pestañas', async () => {
    const five = ['a', 'b', 'c', 'd', 'e'].map((key) => ({
      key,
      label: key.toUpperCase(),
      icon: 'heart' as const,
    }));

    await render(<LiquidTabBar items={five} active="c" />);

    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(screen.getByRole('tab', { name: 'C', selected: true })).toBeTruthy();
  });

  it('tiene el aspecto líquido: borde, relleno translúcido y cápsula', async () => {
    await render(<LiquidTabBar items={items} active="inicio" />);

    expect(screen.getByTestId('liquid-tab-bar')).toHaveStyle({
      borderColor: themes.light.colors.liquidEdge,
      borderRadius: 999,
    });
  });

  it('dibuja la lente que se desliza bajo la pestaña activa, oculta a lectores de pantalla', async () => {
    await render(<LiquidTabBar items={items} active="inicio" />);
    expect(screen.queryByTestId('liquid-lens', { hidden: true })).toBeNull(); // not measured yet

    await fireEvent(screen.getByTestId('liquid-track'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 52 } },
    });

    const lens = screen.getByTestId('liquid-lens', { hidden: true });
    expect(lens.props.accessibilityElementsHidden).toBe(true);
    // One segment per tab: 300 / 2.
    expect(lens).toHaveStyle({ width: 150 });
  });

  it('sigue funcionando si la pestaña activa cambia desde afuera (se mueve la lente)', async () => {
    const { rerender } = await render(<LiquidTabBar items={items} active="inicio" />);
    await fireEvent(screen.getByTestId('liquid-track'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 52 } },
    });

    await rerender(<LiquidTabBar items={items} active="perfil" />);

    expect(screen.getByRole('tab', { name: 'Perfil', selected: true })).toBeTruthy();
  });
});

describe('useLiquidTabBarClearance', () => {
  it('es el espacio que ocupa la barra flotante: separación, alto y aire (sin zona segura: 120)', async () => {
    const { result } = await renderHook(() => useLiquidTabBarClearance());

    // 24 (above the safe area) + 64 (bar) + 32 (air)
    expect(result.current).toBe(120);
  });

  it('suma la zona segura de abajo', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SafeAreaInsetsContext.Provider value={{ top: 47, left: 0, right: 0, bottom: 34 }}>
        {children}
      </SafeAreaInsetsContext.Provider>
    );

    const { result } = await renderHook(() => useLiquidTabBarClearance(), { wrapper });

    expect(result.current).toBe(154);
  });
});
