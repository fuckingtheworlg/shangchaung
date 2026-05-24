import { client } from './client';

export interface Article {
  id: string;
  title: string;
  cover?: string | null;
  content?: string;
  status: number;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleListResp {
  list: Article[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ArticleQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: number | '';
}

export async function listArticles(q: ArticleQuery): Promise<ArticleListResp> {
  const { data } = await client.get('/api/admin/articles', { params: q });
  return data.data;
}

export async function getArticle(id: string): Promise<Article> {
  const { data } = await client.get(`/api/admin/articles/${id}`);
  return data.data;
}

export async function createArticle(payload: Partial<Article>) {
  const { data } = await client.post('/api/admin/articles', payload);
  return data.data;
}

export async function updateArticle(id: string, payload: Partial<Article>) {
  const { data } = await client.put(`/api/admin/articles/${id}`, payload);
  return data.data;
}

export async function deleteArticle(id: string) {
  await client.delete(`/api/admin/articles/${id}`);
}
