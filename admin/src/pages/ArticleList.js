import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Table, Button, Space, Input, Select, Tag, Image, Popconfirm, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { deleteArticle, listArticles } from '../api/articles';
export default function ArticleList() {
    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState({ page: 1, pageSize: 10, keyword: '', status: '' });
    const fetchData = async (q = query) => {
        setLoading(true);
        try {
            const resp = await listArticles(q);
            setData(resp.list);
            setTotal(resp.total);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { fetchData(query); /* eslint-disable-next-line */ }, []);
    const handleDelete = async (id) => {
        await deleteArticle(id);
        message.success('已删除');
        fetchData();
    };
    return (_jsxs("div", { children: [_jsxs(Space, { style: { marginBottom: 16 }, wrap: true, children: [_jsx(Input, { placeholder: "\u641C\u7D22\u6807\u9898", allowClear: true, style: { width: 220 }, value: query.keyword, onChange: (e) => setQuery({ ...query, keyword: e.target.value }), onPressEnter: () => fetchData({ ...query, page: 1 }) }), _jsx(Select, { style: { width: 120 }, value: query.status, onChange: (v) => setQuery({ ...query, status: v }), options: [
                            { value: '', label: '全部状态' },
                            { value: 1, label: '已发布' },
                            { value: 0, label: '草稿' },
                        ] }), _jsx(Button, { type: "primary", onClick: () => fetchData({ ...query, page: 1 }), children: "\u67E5\u8BE2" }), _jsx(Button, { onClick: () => navigate('/articles/new'), children: "\u65B0\u5EFA" })] }), _jsx(Table, { rowKey: "id", loading: loading, dataSource: data, pagination: {
                    current: query.page,
                    pageSize: query.pageSize,
                    total,
                    showSizeChanger: true,
                    onChange: (page, pageSize) => {
                        const next = { ...query, page, pageSize };
                        setQuery(next);
                        fetchData(next);
                    },
                }, columns: [
                    {
                        title: '封面',
                        dataIndex: 'cover',
                        width: 100,
                        render: (v) => v ? _jsx(Image, { src: v, width: 64, height: 64, style: { objectFit: 'cover', borderRadius: 4 } }) : '—',
                    },
                    { title: '标题', dataIndex: 'title', ellipsis: true },
                    {
                        title: '状态', dataIndex: 'status', width: 100,
                        render: (v) => v === 1 ? _jsx(Tag, { color: "green", children: "\u5DF2\u53D1\u5E03" }) : _jsx(Tag, { children: "\u8349\u7A3F" }),
                    },
                    { title: '排序', dataIndex: 'sort', width: 80 },
                    {
                        title: '更新时间', dataIndex: 'updatedAt', width: 180,
                        render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm'),
                    },
                    {
                        title: '操作', width: 160, fixed: 'right',
                        render: (_, r) => (_jsxs(Space, { children: [_jsx(Button, { size: "small", type: "link", onClick: () => navigate(`/articles/${r.id}`), children: "\u7F16\u8F91" }), _jsx(Popconfirm, { title: "\u786E\u8BA4\u5220\u9664\uFF1F", onConfirm: () => handleDelete(r.id), children: _jsx(Button, { size: "small", type: "link", danger: true, children: "\u5220\u9664" }) })] })),
                    },
                ] })] }));
}
