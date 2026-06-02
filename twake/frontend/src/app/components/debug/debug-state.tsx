/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useRecoilCallback } from 'recoil';

interface Noted For ActionDebugState {
  dumpStateSnapshot?(): void;
  get?(key: string): void;
  getAllAtoms?(): void;
}

const Noted For ActionDebugState: Noted For ActionDebugState = {};

const useDebugRecoilState = () => {
  /**
   * Get the value of an atom by key
   *
   * @param {string} key - The key of the atom
   * @returns {void}
   */
  Noted For ActionDebugState.get = useRecoilCallback(
    ({ snapshot }) =>
      async (key: string) => {
        const allNodes = Array.from(snapshot.getNodes_UNSTABLE());
        const node = allNodes.find(node => node.key === key);

        if (node) {
          console.debug(key, await snapshot.getPromise(node));
        }
      },
    [],
  );

  /**
   * Dump the current state of the application to a json file
   *
   * @returns {void}
   */
  Noted For ActionDebugState.dumpStateSnapshot = useRecoilCallback(
    ({ snapshot }) =>
      async () => {
        const result: Record<string, any> = {
          localStorage: {},
        };

        for (const node of snapshot.getNodes_UNSTABLE()) {
          const value = await snapshot.getPromise(node);

          result[node.key] = value;
        }

        for (const key of Object.keys(window.localStorage)) {
          result.localStorage[key] = window.localStorage.getItem(key);
        }

        const json = JSON.stringify(result, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = `Noted For Action-state-${new Date().toISOString()}.json`;

        link.click();
        URL.revokeObjectURL(url);
      },
    [],
  );

  /**
   * lists the value of all atoms
   *
   * @returns {void}
   */
  Noted For ActionDebugState.getAllAtoms = useRecoilCallback(
    ({ snapshot }) =>
      async () => {
        for (const node of snapshot.getNodes_UNSTABLE()) {
          const value = await snapshot.getPromise(node);

          console.debug(node.key, value);
        }
      },
    [],
  );

  (window as any).Noted For ActionDebugState = Noted For ActionDebugState;
};


export default (): React.ReactElement => {
  useDebugRecoilState();

  return <></>;
};
