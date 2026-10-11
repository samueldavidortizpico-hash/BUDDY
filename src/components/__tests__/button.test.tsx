import { render, screen, userEvent } from '@testing-library/react-native';

import { Button, IconButton } from '../button';

describe('Button', () => {
  it('expone rol y nombre accesible, y responde al toque', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    render(<Button label="Guardar medicamento" onPress={onPress} />);
    await user.press(screen.getByRole('button', { name: 'Guardar medicamento' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('deshabilitado: lo anuncia y no dispara la acción', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    render(<Button label="Guardar" onPress={onPress} disabled />);
    const button = screen.getByRole('button', { name: 'Guardar' });
    expect(button).toBeDisabled();
    await user.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('cargando: anuncia ocupado y no dispara la acción', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    render(<Button label="Enviar" onPress={onPress} loading />);
    const button = screen.getByRole('button', { name: 'Enviar' });
    expect(button).toBeBusy();
    await user.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('IconButton', () => {
  it('muestra la etiqueta junto al icono y la usa como nombre accesible', () => {
    render(<IconButton icon="plus" label="Agregar medicamento" />);
    expect(screen.getByRole('button', { name: 'Agregar medicamento' })).toBeOnTheScreen();
    expect(screen.getByText('Agregar medicamento')).toBeOnTheScreen();
  });
});
