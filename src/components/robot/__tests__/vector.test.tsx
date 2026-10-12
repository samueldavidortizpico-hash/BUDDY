import { render } from '@testing-library/react-native';
import { StyleSheet, View } from 'react-native';
import * as Reanimated from 'react-native-reanimated';

import { BuddyRobotVector, type RobotMood } from '../vector';

// Use the installed native style processor: the Reanimated mock alone does not
// parse transformOrigin and would miss the Expo Go render failure.
const { default: processTransformOrigin } = jest.requireActual<{
  default: (origin: unknown) => unknown;
}>('react-native/Libraries/StyleSheet/processTransformOrigin');

const moods: RobotMood[] = ['idle', 'wave', 'think', 'talk', 'celebrate', 'worry', 'look', 'cover', 'sleep'];
// Draw-order coordinates: right arm, heart, head, eyes, mouth, left arm.
const points = [[682, 678], [586, 716], [500, 620], [490, 410], [490, 492], [372, 682]];

function checkPivots(size: number, mood: RobotMood, animated: boolean, look = 0) {
  const robot = render(<BuddyRobotVector size={size} mood={mood} animated={animated} look={look} />);
  const layers = robot.UNSAFE_getAllByType(View)
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
  robot.unmount();
}

describe('BuddyRobotVector transform origins', () => {
  it('reproduces the native decimal-string parser failure', () => {
    const previousOrigin = `${(682 - 110) / 820 * 100}% ${(678 - 30) / 920 * 100}%`;
    expect(() => processTransformOrigin(previousOrigin)).toThrow('Transform origin z-position must be a number');
  });

  describe.each([true, false])('animated=%s', (animated) => {
    it.each(moods)('keeps six valid native pivots in %s', (mood) => {
      checkPivots(180, mood, animated);
    });
  });

  it.each([48, 320, 512])('preserves the joints at size %s', (size) => {
    checkPivots(size, 'look', true, -1);
  });

  it('keeps valid pivots with reduced motion', () => {
    const reducedMotion = jest.spyOn(Reanimated, 'useReducedMotion').mockReturnValue(true);
    try {
      checkPivots(180, 'celebrate', true, 1);
    } finally {
      reducedMotion.mockRestore();
    }
  });

  it('does not start transform loops when reduced motion is enabled', () => {
    const reducedMotion = jest.spyOn(Reanimated, 'useReducedMotion').mockReturnValue(true);
    const repeat = jest.spyOn(Reanimated, 'withRepeat');
    try {
      checkPivots(180, 'think', true);
      expect(repeat).not.toHaveBeenCalled();
    } finally {
      repeat.mockRestore();
      reducedMotion.mockRestore();
    }
  });
});
