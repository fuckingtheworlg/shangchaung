import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useMemo } from 'react';
import { Form, Input, InputNumber, Select, Button, Space, Upload, message, Card } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { Editor, Toolbar } from '@wangeditor/editor-for-react';
import { createArticle, getArticle, updateArticle } from '../api/articles';
import { getToken } from '../api/client';
export default function ArticleEdit() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;
    const [form] = Form.useForm();
    const [editor, setEditor] = useState(null);
    const [html, setHtml] = useState('');
    const [cover, setCover] = useState('');
    const [submitting, setSubmitting] = useState(false);
    useEffect(() => {
        if (!isEdit)
            return;
        (async () => {
            const a = await getArticle(id);
            form.setFieldsValue({
                title: a.title,
                status: a.status,
                sort: a.sort,
            });
            setHtml(a.content || '');
            setCover(a.cover || '');
        })();
        // eslint-disable-next-line
    }, [id]);
    useEffect(() => {
        return () => {
            if (editor) {
                editor.destroy();
                setEditor(null);
            }
        };
    }, [editor]);
    const toolbarConfig = {};
    const editorConfig = useMemo(() => ({
        placeholder: '在此输入正文...支持图片、视频、表格、代码等',
        MENU_CONF: {
            uploadImage: {
                server: '/api/admin/upload',
                fieldName: 'file',
                maxFileSize: 10 * 1024 * 1024,
                headers: {
                    Authorization: `Bearer ${getToken()}`,
                },
                // 后端已返回 { errno: 0, data: { url } }
            },
        },
    }), []);
    const uploadCoverProps = {
        name: 'file',
        action: '/api/admin/upload',
        headers: { Authorization: `Bearer ${getToken()}` },
        showUploadList: false,
        accept: 'image/*',
        beforeUpload: (file) => {
            if (file.size > 10 * 1024 * 1024) {
                message.error('封面图不能超过 10MB');
                return Upload.LIST_IGNORE;
            }
            return true;
        },
        onChange: (info) => {
            if (info.file.status === 'done') {
                const url = info.file.response?.data?.url || info.file.response?.url;
                if (url) {
                    setCover(url);
                    message.success('封面上传成功');
                }
            }
            else if (info.file.status === 'error') {
                message.error('封面上传失败');
            }
        },
    };
    const onFinish = async (values) => {
        if (!values.title?.trim()) {
            message.warning('请填写标题');
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                title: values.title.trim(),
                cover: cover || null,
                content: html,
                status: values.status ?? 0,
                sort: values.sort ?? 0,
            };
            if (isEdit) {
                await updateArticle(id, payload);
                message.success('已保存');
            }
            else {
                await createArticle(payload);
                message.success('已新建');
            }
            navigate('/articles');
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsx(Card, { children: _jsxs(Form, { form: form, layout: "vertical", initialValues: { status: 0, sort: 0 }, onFinish: onFinish, children: [_jsx(Form.Item, { label: "\u6807\u9898", name: "title", rules: [{ required: true, message: '请输入标题' }], children: _jsx(Input, { maxLength: 200, showCount: true, placeholder: "\u6587\u7AE0\u6807\u9898" }) }), _jsx(Form.Item, { label: "\u5C01\u9762\u56FE\uFF08\u53EF\u9009\uFF0C\u7528\u4E8E\u5C0F\u7A0B\u5E8F\u5217\u8868\u5C55\u793A\uFF09", children: _jsxs(Space, { direction: "vertical", children: [_jsx(Upload, { ...uploadCoverProps, children: cover ? (_jsx("img", { src: cover, alt: "cover", style: { width: 160, height: 100, objectFit: 'cover', borderRadius: 4 } })) : (_jsxs("div", { style: { width: 160, height: 100, border: '1px dashed #d9d9d9', borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#999' }, children: [_jsx(PlusOutlined, {}), _jsx("div", { style: { marginTop: 8 }, children: "\u4E0A\u4F20\u5C01\u9762" })] })) }), cover && _jsx(Button, { size: "small", onClick: () => setCover(''), children: "\u79FB\u9664\u5C01\u9762" })] }) }), _jsx(Form.Item, { label: "\u6B63\u6587", children: _jsxs("div", { style: { border: '1px solid #ccc', borderRadius: 4 }, children: [_jsx(Toolbar, { editor: editor, defaultConfig: toolbarConfig, mode: "default", style: { borderBottom: '1px solid #ccc' } }), _jsx(Editor, { defaultConfig: editorConfig, value: html, onCreated: setEditor, onChange: (e) => setHtml(e.getHtml()), mode: "default", style: { height: 500, overflowY: 'hidden' } })] }) }), _jsxs(Space, { size: "large", children: [_jsx(Form.Item, { label: "\u72B6\u6001", name: "status", style: { marginBottom: 0 }, children: _jsx(Select, { style: { width: 140 }, options: [
                                    { value: 0, label: '草稿' },
                                    { value: 1, label: '已发布' },
                                ] }) }), _jsx(Form.Item, { label: "\u6392\u5E8F\u6743\u91CD", name: "sort", style: { marginBottom: 0 }, tooltip: "\u6570\u503C\u8D8A\u5927\u8D8A\u9760\u524D", children: _jsx(InputNumber, { style: { width: 140 } }) })] }), _jsx(Form.Item, { style: { marginTop: 24 }, children: _jsxs(Space, { children: [_jsx(Button, { type: "primary", htmlType: "submit", loading: submitting, children: "\u4FDD\u5B58" }), _jsx(Button, { onClick: () => navigate('/articles'), children: "\u53D6\u6D88" })] }) })] }) }));
}
