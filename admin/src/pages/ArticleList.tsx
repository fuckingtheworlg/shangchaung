import { useEffect, useState } from 'react';
import { Table, Button, Space, Input, Select, Tag, Image, Popconfirm, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Article, ArticleQuery, deleteArticle, listArticles } from '../api/articles';

export default function ArticleList() {
  const navigate = useNavigate();
  const [data, setData] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState<ArticleQuery>({ page: 1, pageSize: 10, keyword: '', status: '' });

  const fetchData = async (q: ArticleQuery = query) => {
    setLoading(true);
    try {
      const resp = await listArticles(q);
      setData(resp.list);
      setTotal(resp.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(query); /* eslint-disable-next-line */ }, []);

  const handleDelete = async (id: string) => {
    await deleteArticle(id);
    message.success('已删除');
    fetchData();
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="搜索标题"
          allowClear
          style={{ width: 220 }}
          value={query.keyword}
          onChange={(e) => setQuery({ ...query, keyword: e.target.value })}
          onPressEnter={() => fetchData({ ...query, page: 1 })}
        />
        <Select
          style={{ width: 120 }}
          value={query.status}
          onChange={(v) => setQuery({ ...query, status: v })}
          options={[
            { value: '', label: '全部状态' },
            { value: 1, label: '已发布' },
            { value: 0, label: '草稿' },
          ]}
        />
        <Button type="primary" onClick={() => fetchData({ ...query, page: 1 })}>查询</Button>
        <Button onClick={() => navigate('/articles/new')}>新建</Button>
      </Space>

      <Table<Article>
        rowKey="id"
        loading={loading}
        dataSource={data}
        pagination={{
          current: query.page,
          pageSize: query.pageSize,
          total,
          showSizeChanger: true,
          onChange: (page, pageSize) => {
            const next = { ...query, page, pageSize };
            setQuery(next);
            fetchData(next);
          },
        }}
        columns={[
          {
            title: '封面',
            dataIndex: 'cover',
            width: 100,
            render: (v) => v ? <Image src={v} width={64} height={64} style={{ objectFit: 'cover', borderRadius: 4 }} /> : '—',
          },
          { title: '标题', dataIndex: 'title', ellipsis: true },
          {
            title: '状态', dataIndex: 'status', width: 100,
            render: (v) => v === 1 ? <Tag color="green">已发布</Tag> : <Tag>草稿</Tag>,
          },
          { title: '排序', dataIndex: 'sort', width: 80 },
          {
            title: '更新时间', dataIndex: 'updatedAt', width: 180,
            render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm'),
          },
          {
            title: '操作', width: 160, fixed: 'right',
            render: (_, r) => (
              <Space>
                <Button size="small" type="link" onClick={() => navigate(`/articles/${r.id}`)}>编辑</Button>
                <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id)}>
                  <Button size="small" type="link" danger>删除</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
}
