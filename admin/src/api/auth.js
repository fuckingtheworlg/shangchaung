import { client, setToken } from './client';
export async function login(username, password) {
    const { data } = await client.post('/api/admin/login', { username, password });
    setToken(data.data.token);
    return data.data;
}
