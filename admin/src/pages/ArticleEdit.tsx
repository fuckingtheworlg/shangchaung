import { useEffect, useState, useMemo } from 'react';
import { Form, Input, InputNumber, Select, Button, Space, Upload, message, Card } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { Editor, Toolbar } from '@wangeditor/editor-for-react';
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor';
import { createArticle, getArticle, updateArticle } from '../api/articles';
import { getToken } from '../api/client';

export default function ArticleEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [form] = Form.useForm();
  const [editor, setEditor] = useState<IDomEditor | null>(null);
  const [html, setHtml] = useState('');
  const [cover, setCover] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const a = await getArticle(id!);
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

  const toolbarConfig: Partial<IToolbarConfig> = {};
  const editorConfig: Partial<IEditorConfig> = useMemo(() => ({
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
    beforeUpload: (file: File) => {
      if (file.size > 10 * 1024 * 1024) {
        message.error('封面图不能超过 10MB');
        return Upload.LIST_IGNORE;
      }
      return true;
    },
    onChange: (info: any) => {
      if (info.file.status === 'done') {
        const url = info.file.response?.data?.url || info.file.response?.url;
        if (url) {
          setCover(url);
          message.success('封面上传成功');
        }
      } else if (info.file.status === 'error') {
        message.error('封面上传失败');
      }
    },
  };

  const onFinish = async (values: any) => {
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
        await updateArticle(id!, payload);
        message.success('已保存');
      } else {
        await createArticle(payload);
        message.success('已新建');
      }
      navigate('/articles');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ status: 0, sort: 0 }}
        onFinish={onFinish}
      >
        <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
          <Input maxLength={200} showCount placeholder="文章标题" />
        </Form.Item>

        <Form.Item label="封面图（可选，用于小程序列表展示）">
          <Space direction="vertical">
            <Upload {...uploadCoverProps}>
              {cover ? (
                <img src={cover} alt="cover" style={{ width: 160, height: 100, objectFit: 'cover', borderRadius: 4 }} />
              ) : (
                <div style={{ width: 160, height: 100, border: '1px dashed #d9d9d9', borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>上传封面</div>
                </div>
              )}
            </Upload>
            {cover && <Button size="small" onClick={() => setCover('')}>移除封面</Button>}
          </Space>
        </Form.Item>

        <Form.Item label="正文">
          <div style={{ border: '1px solid #ccc', borderRadius: 4 }}>
            <Toolbar
              editor={editor}
              defaultConfig={toolbarConfig}
              mode="default"
              style={{ borderBottom: '1px solid #ccc' }}
            />
            <Editor
              defaultConfig={editorConfig}
              value={html}
              onCreated={setEditor}
              onChange={(e) => setHtml(e.getHtml())}
              mode="default"
              style={{ height: 500, overflowY: 'hidden' }}
            />
          </div>
        </Form.Item>

        <Space size="large">
          <Form.Item label="状态" name="status" style={{ marginBottom: 0 }}>
            <Select
              style={{ width: 140 }}
              options={[
                { value: 0, label: '草稿' },
                { value: 1, label: '已发布' },
              ]}
            />
          </Form.Item>
          <Form.Item label="排序权重" name="sort" style={{ marginBottom: 0 }} tooltip="数值越大越靠前">
            <InputNumber style={{ width: 140 }} />
          </Form.Item>
        </Space>

        <Form.Item style={{ marginTop: 24 }}>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>保存</Button>
            <Button onClick={() => navigate('/articles')}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
