import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import * as Reanimated from 'react-native-reanimated';

import { BuddyRobotVector, type RobotMood } from '../vector';

// Use the installed native style processor: the Reanimated mock alone does not
// parse transformOrigin and would miss the Expo Go render failure.
const { default: processTransformOrigin } = jest.requireActual<{
  default: (origin: unknown) => unknown;
}>('react-native/Libraries/StyleSheet/processTransformOrigin');

const moods: RobotMood[] = ['idle', 'happy', 'wave', 'think', 'talk', 'celebrate', 'worry', 'look', 'cover', 'sleep', 'love', 'surprised', 'wink'];
// Draw-order coordinates: right arm, heart, head, eyes, mouth, left arm.
const points = [[682, 678], [586, 716], [500, 620], [490, 410], [490, 492], [372, 682]];

async function checkPivots(size: number, mood: RobotMood, animated: boolean, look = 0) {
  const robot = await render(<BuddyRobotVector size={size} mood={mood} animated={animated} look={look} />);
  const layers = robot.container
    .queryAll((node) => node.type === 'View')
    .map((view) => StyleSheet.flatten(view.props.style))
    .filter((style) => style?.transformOrigin !== undefined);

  expect(layers).toHaveLength(points.length);
  layers.forEach((style, index) => {
    const origin = style.transformOrigin;
    expect(Array.isArray(origin)).toBe(true);
    expect(origin).toHaveLength(3);
    const [x, y, z] = origin as [string, string, number];
    [x, y].forEach((coordinate) => {
      expect(coordinate).toMatch(/^\d+(?:\.\d+)?%$/);
      const value = Number(coordinate.slice(0, -1));
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    });
    expect(Number.isFinite(z)).toBe(true);
    expect(z).toBe(0);
    expect(() => processTransformOrigin(origin)).not.toThrow();
    expect(processTransformOrigin(origin)).toEqual(origin);

    // Keep the original joints and scale-independent positioning.
    const [drawingX, drawingY] = points[index];
    expect(parseFloat(x) / 100 * style.width).toBeCloseTo((drawingX - 110) * size / 920);
    expect(parseFloat(y) / 100 * style.height).toBeCloseTo((drawingY - 30) * size / 920);
    expect(style.transform.length).toBeGreaterThan(0);
  });
  await robot.unmount();
}

describe('BuddyRobotVector transform origins', () => {
  // SDK 57 (RN 0.86) lanzaba "Transform origin z-position must be a number" con porcentajes decimales en texto, y el
  // robot lo evitaba usando la forma de arreglo. RN 0.88 (SDK 58) ya lo acepta; se conserva la forma de arreglo y se
  // documenta aquí el cambio para saber que el parser de la plataforma ya no es la razón de ser de esa forma.
  it('RN 0.88 parses decimal-string origins without throwing (it threw in RN 0.86)', () => {
    const previousOrigin = `${(682 - 110) / 820 * 100}% ${(678 - 30) / 920 * 100}%`;
    expect(() => processTransformOrigin(previousOrigin)).not.toThrow();
    expect(processTransformOrigin(previousOrigin)).toHaveLength(3);
  });

  describe.each([true, false])('animated=%s', (animated) => {
    it.each(moods)('keeps six valid native pivots in %s', async (mood) => {
      await checkPivots(180, mood, animated);
    });
  });

  it.each([48, 320, 512])('preserves the joints at size %s', async (size) => {
    await checkPivots(size, 'look', true, -1);
  });

  it('keeps valid pivots with reduced motion', async () => {
    const reducedMotion = jest.spyOn(Reanimated, 'useReducedMotion').mockReturnValue(true);
    try {
      await checkPivots(180, 'celebrate', true, 1);
    } finally {
      reducedMotion.mockRestore();
    }
  });

  it('does not start transform loops when reduced motion is enabled', async () => {
    const reducedMotion = jest.spyOn(Reanimated, 'useReducedMotion').mockReturnValue(true);
    const repeat = jest.spyOn(Reanimated, 'withRepeat');
    try {
      await checkPivots(180, 'think', true);
      expect(repeat).not.toHaveBeenCalled();
    } finally {
      repeat.mockRestore();
      reducedMotion.mockRestore();
    }
  });
});
