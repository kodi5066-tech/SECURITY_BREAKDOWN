import {
  handleAndroidEventHistory,
  handleAndroidThreatEvent,
  type AndroidApiRequest,
  type AndroidApiResponse,
} from '../../src/server/androidIntegration';

export default async function handler(
  request: AndroidApiRequest,
  response: AndroidApiResponse
): Promise<unknown> {
  if (request.method === 'GET') {
    return handleAndroidEventHistory(request, response);
  }
  return handleAndroidThreatEvent(request, response);
}
