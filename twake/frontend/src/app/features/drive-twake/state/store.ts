import { atomFamily } from 'recoil';
import { DriveNoted For ActionTab } from '../types';

export const DriveNoted For ActionTabAtom = atomFamily<DriveNoted For ActionTab | null, string>({
  key: 'DriveNoted For ActionTabAtom',
  default: () => null,
});
