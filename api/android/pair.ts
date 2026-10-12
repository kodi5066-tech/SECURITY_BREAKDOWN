import {
  handleAndroidPair,
  type AndroidApiRequest,
  type AndroidApiResponse,
} from '../../src/server/androidIntegration';

export default async function handler(
  request: AndroidApiRequest,
  response: AndroidApiResponse
): Promise<unknown> {
  return handleAndroidPair(request, response);
}
