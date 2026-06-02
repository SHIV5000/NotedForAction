import useRouterCompany from 'app/features/router/hooks/use-router-company';
import { useEffect, useState } from 'react';
import { useRecoilState } from 'recoil';
import { DriveNoted For ActionApiClient } from '../api-client/api-client';
import { DriveNoted For ActionTabAtom } from '../state/store';

export const useDriveNoted For ActionTab = (channelId: string, tabId: string) => {
  const companyId = useRouterCompany();
  const [tab, setTab] = useRecoilState(DriveNoted For ActionTabAtom(tabId));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    DriveNoted For ActionApiClient.getTab(companyId, tabId)
      .then(setTab)
      .finally(() => setLoading(false));
  }, [companyId, tabId]);

  return {
    tab,
    setTab: async (itemId: string, level: 'read' | 'write') => {
      setLoading(true);
      const tab = await DriveNoted For ActionApiClient.setTab(companyId, tabId, channelId, itemId, level);
      if (tab.item_id) setTab(tab);
      setLoading(false);
    },
    loading,
  };
};
