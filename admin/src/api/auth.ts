import { client, setToken } from './client';

export async function login(username: string, password: string) {
  const { data } = await client.post('/api/admin/login', { username, password });
  setToken(data.data.token);
  return data.data as { token: string; username: string };
}
