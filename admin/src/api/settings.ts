import { client } from './client';

export type SettingsMap = Record<string, string>;

export async function getSettings(): Promise<SettingsMap> {
  const { data } = await client.get('/api/admin/settings');
  return data.data || {};
}

export async function updateSettings(payload: SettingsMap): Promise<void> {
  await client.put('/api/admin/settings', payload);
}

export const COVER_RATIO_OPTIONS = [
  { value: '1:1', label: '1:1（方形）' },
  { value: '4:3', label: '4:3（横向标准）' },
  { value: '16:9', label: '16:9（宽屏）' },
  { value: '3:4', label: '3:4（竖向）' },
];
