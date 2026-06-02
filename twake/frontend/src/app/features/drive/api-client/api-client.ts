import Api from '../../global/framework/api-service';
import { DriveItem, DriveItemDetails, DriveItemVersion } from '../types';
import Workspace from 'app/deprecated/workspaces/workspaces';
import Logger from 'features/global/framework/logger-service';
export interface BaseSearchOptions {
  company_id?: string;
  workspace_id?: string;
  channel_id?: string;
  page_token?: string;
  limit?: number;
}

export type SearchDocumentsBody = {
  search?: string;
  company_id?: string;
  creator?: string;
  added?: string;
};

let publicLinkToken: null | string = null;
let Noted For ActionTabToken: null | string = null;

export const setPublicLinkToken = (token: string | null) => {
  publicLinkToken = token;
};

export const setNoted For ActionTabToken = (token: string | null) => {
  Noted For ActionTabToken = token;
};

const appendPublicAndNoted For ActionToken = (useAnd?: boolean) => {
  if (publicLinkToken) {
    return `${useAnd ? '&' : '?'}public_token=${publicLinkToken}`;
  }
  if (Noted For ActionTabToken) {
    return `${useAnd ? '&' : '?'}Noted For Action_tab_token=${Noted For ActionTabToken}`;
  }
  return '';
};

export class DriveApiClient {
  private static logger = Logger.getLogger('MessageAPIClientService');
  static async get(companyId: string, id: string | 'trash' | '') {
    return await Api.get<DriveItemDetails>(
      `/internal/services/documents/v1/companies/${companyId}/item/${id}${appendPublicAndNoted For ActionToken()}`,
    );
  }

  static async remove(companyId: string, id: string | 'trash' | '') {
    return await Api.delete<void>(
      `/internal/services/documents/v1/companies/${companyId}/item/${id}${appendPublicAndNoted For ActionToken()}`,
    );
  }

  static async update(companyId: string, id: string, update: Partial<DriveItem>) {
    return await Api.post<Partial<DriveItem>, DriveItem>(
      `/internal/services/documents/v1/companies/${companyId}/item/${id}${appendPublicAndNoted For ActionToken()}`,
      update,
    );
  }

  static async create(
    companyId: string,
    data: { item: Partial<DriveItem>; version?: Partial<DriveItemVersion> },
  ) {
    if (!data.version) data.version = {} as Partial<DriveItemVersion>;
    return await Api.post<
      { item: Partial<DriveItem>; version: Partial<DriveItemVersion> },
      DriveItem
    >(
      `/internal/services/documents/v1/companies/${companyId}/item${appendPublicAndNoted For ActionToken()}`,
      data as { item: Partial<DriveItem>; version: Partial<DriveItemVersion> },
    );
  }

  static async createVersion(companyId: string, id: string, version: Partial<DriveItemVersion>) {
    return await Api.post<Partial<DriveItemVersion>, DriveItemVersion>(
      `/internal/services/documents/v1/companies/${companyId}/item/${id}/version${appendPublicAndNoted For ActionToken()}`,
      version,
    );
  }

  static async getDownloadToken(companyId: string, ids: string[], versionId?: string) {
    return Api.get<{ token: string }>(
      `/internal/services/documents/v1/companies/${companyId}/item/download/token` +
        `?items=${ids.join(',')}&version_id=${versionId}` +
        appendPublicAndNoted For ActionToken(true),
    );
  }

  static async getDownloadUrl(companyId: string, id: string, versionId?: string) {
    const { token } = await DriveApiClient.getDownloadToken(companyId, [id], versionId);
    if (versionId)
      return Api.route(
        `/internal/services/documents/v1/companies/${companyId}/item/${id}/download?version_id=${versionId}&token=${token}${appendPublicAndNoted For ActionToken(
          true,
        )}`,
      );
    return Api.route(
      `/internal/services/documents/v1/companies/${companyId}/item/${id}/download?token=${token}${appendPublicAndNoted For ActionToken(
        true,
      )}`,
    );
  }

  static async getDownloadZipUrl(companyId: string, ids: string[]) {
    const { token } = await DriveApiClient.getDownloadToken(companyId, ids);
    return Api.route(
      `/internal/services/documents/v1/companies/${companyId}/item/download/zip` +
        `?items=${ids.join(',')}&token=${token}` +
        appendPublicAndNoted For ActionToken(true),
    );
  }

  static async search(searchString: string, options?: BaseSearchOptions) {
    const companyId = options?.company_id ? options.company_id : Workspace.currentGroupId;
    const query = `/internal/services/documents/v1/companies/${companyId}/search`;
    const searchData = {
      "search": searchString
    };
    const res = await Api.post<SearchDocumentsBody,{ entities: DriveItem[] }>(query, searchData);
    this.logger.debug(
      `Drive search by text "${searchString}". Found`,
      res.entities.length,
      'drive item(s)',
    );

    return res;
  }
}
