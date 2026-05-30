import { useEffect, useState, useMemo } from 'react';
import { Form, Input, InputNumber, Select, Button, Space, Upload, message, Card, Typography } from 'antd';
import { PlusOutlined, PictureOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { Editor, Toolbar } from '@wangeditor/editor-for-react';
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor';
import { createArticle, getArticle, updateArticle } from '../api/articles';
import { getToken } from '../api/client';

// 单张图片上传上限（MB），需与后端 multer 及 nginx client_max_body_size 保持一致
const MAX_UPLOAD_MB = 1024;

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
    // 把 wangEditor 自身的告警（含图片超限提示）统一走 antd message，避免用户看不到
    customAlert: (info: string, type: string) => {
      const fn = (message as any)[type] || message.info;
      fn(info);
    },
    MENU_CONF: {
      uploadImage: {
        server: '/api/admin/upload',
        fieldName: 'file',
        maxFileSize: MAX_UPLOAD_MB * 1024 * 1024,
        timeout: 10 * 60 * 1000, // 大图上传放宽到 10 分钟
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        // 后端已返回 { errno: 0, data: { url } }
        onError(file: File, err: any, res: any) {
          message.error(`「${file.name}」上传失败：${res?.message || err?.message || '请重试'}`);
        },
        onFailed(file: File, res: any) {
          message.error(`「${file.name}」上传失败：${res?.message || '服务器拒绝'}`);
        },
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
      if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
        message.error(`封面图不能超过 ${MAX_UPLOAD_MB}MB`);
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

  // 把图片插入到编辑器当前光标处（手机端绕开 wangEditor 工具栏下拉的可靠入口）
  const insertImageToEditor = (url: string) => {
    if (!editor) {
      message.warning('编辑器未就绪，请稍候重试');
      return;
    }
    if (editor.selection) {
      editor.restoreSelection();
    } else {
      editor.focus(true);
    }
    editor.dangerouslyInsertHtml(`<img src="${url}" alt="" style="max-width:100%;"/>`);
  };

  // 独立「插入图片」按钮用的上传配置，走原生 <input type=file>，手机触摸可靠
  const insertImageUploadProps = {
    name: 'file',
    action: '/api/admin/upload',
    headers: { Authorization: `Bearer ${getToken()}` },
    showUploadList: false,
    accept: 'image/*',
    multiple: true,
    beforeUpload: (file: File) => {
      if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
        message.error(`图片不能超过 ${MAX_UPLOAD_MB}MB`);
        return Upload.LIST_IGNORE;
      }
      return true;
    },
    onChange: (info: any) => {
      const f = info.file;
      if (f.status === 'done') {
        const url = f.response?.data?.url || f.response?.url;
        if (url) {
          insertImageToEditor(url);
          message.success('图片已插入正文');
        } else {
          message.error(f.response?.message || '上传失败');
        }
      } else if (f.status === 'error') {
        message.error('上传失败，请重试');
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
          <Space style={{ marginBottom: 8 }} wrap>
            <Upload {...insertImageUploadProps}>
              <Button icon={<PictureOutlined />}>插入图片</Button>
            </Upload>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              手机端若工具栏的图片按钮点不动，请用这个按钮插入图片（可多选）
            </Typography.Text>
          </Space>
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
