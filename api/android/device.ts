import {
  handleAndroidUnpair,
  type AndroidApiRequest,
  type AndroidApiResponse,
} from '../../src/server/androidIntegration';

export default async function handler(
  request: AndroidApiRequest,
  response: AndroidApiResponse
): Promise<unknown> {
  return handleAndroidUnpair(request, response);
}
