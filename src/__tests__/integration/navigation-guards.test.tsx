import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import CaregiverLayout from '@/app/(caregiver)/_layout';
import ElderLayout from '@/app/elder/_layout';
import { db } from '@/infrastructure/local/db';
import { useHomeHref } from '@/state/nav';
import { useSession } from '@/state/session';
import { RenderProviders, seedRenderData, testUser } from '@/testing/render-fixtures';

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const { Text: NativeText } = jest.requireActual('react-native');
    return <NativeText>{`redirect:${href}`}</NativeText>;
  },
  Stack: () => {
    const { Text: NativeText } = jest.requireActual('react-native');
    return <NativeText>stack</NativeText>;
  },
}));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

let elderId: string;
beforeEach(async () => { elderId = (await seedRenderData()).id; });

function HomeProbe() { return <Text>{String(useHomeHref())}</Text>; }

it.each(['missing', 'deleted', 'other-owner'])('does not bounce summary/elder with a %s patient', async (kind) => {
  if (kind === 'deleted') db.update('elders', elderId, { deletedAt: new Date().toISOString() });
  if (kind === 'other-owner') db.update('elders', elderId, { ownerUserId: 'another-user' });
  db.setHandoff({ userId: testUser.id, elderId: kind === 'missing' ? 'missing' : elderId, failedPins: 0, lockedUntil: null });
  const caregiver = await render(<CaregiverLayout />, { wrapper: RenderProviders });
  expect(caregiver.getByText('stack')).toBeTruthy();
  await caregiver.unmount();
  const elder = await render(<ElderLayout />, { wrapper: RenderProviders });
  expect(elder.getByText('redirect:/summary')).toBeTruthy();
  await elder.unmount();
  const home = await render(<HomeProbe />);
  expect(home.queryByText('/elder')).toBeNull();
});

it('keeps a valid handoff protected and routes home to elder', async () => {
  db.setHandoff({ userId: testUser.id, elderId, failedPins: 0, lockedUntil: null });
  const caregiver = await render(<CaregiverLayout />, { wrapper: RenderProviders });
  expect(caregiver.getByText('redirect:/elder')).toBeTruthy();
  await caregiver.unmount();
  const elder = await render(<ElderLayout />, { wrapper: RenderProviders });
  expect(elder.getByText('stack')).toBeTruthy();
  await elder.unmount();
  expect((await render(<HomeProbe />)).getByText('/elder')).toBeTruthy();
});

it('routes signed-out users to welcome from both protected layouts', async () => {
  useSession.setState({ status: 'signedOut', user: null });
  for (const Layout of [CaregiverLayout, ElderLayout]) {
    const screen = await render(<Layout />, { wrapper: RenderProviders });
    expect(screen.getByText('redirect:/')).toBeTruthy();
    await screen.unmount();
  }
});
