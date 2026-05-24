import { client } from './client';
export async function listArticles(q) {
    const { data } = await client.get('/api/admin/articles', { params: q });
    return data.data;
}
export async function getArticle(id) {
    const { data } = await client.get(`/api/admin/articles/${id}`);
    return data.data;
}
export async function createArticle(payload) {
    const { data } = await client.post('/api/admin/articles', payload);
    return data.data;
}
export async function updateArticle(id, payload) {
    const { data } = await client.put(`/api/admin/articles/${id}`, payload);
    return data.data;
}
export async function deleteArticle(id) {
    await client.delete(`/api/admin/articles/${id}`);
}
