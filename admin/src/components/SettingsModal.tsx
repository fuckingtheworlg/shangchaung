import { useEffect, useState } from 'react';
import { Modal, Form, Radio, message, Spin, Typography } from 'antd';
import { COVER_RATIO_OPTIONS, getSettings, updateSettings } from '../api/settings';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getSettings()
      .then((s) => {
        form.setFieldsValue({
          cover_aspect_ratio: s.cover_aspect_ratio || '1:1',
        });
      })
      .finally(() => setLoading(false));
  }, [open, form]);

  const onOk = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      await updateSettings(values);
      message.success('已保存（小程序下次进入或下拉刷新后生效）');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="系统设置"
      open={open}
      onCancel={onClose}
      onOk={onOk}
      confirmLoading={submitting}
      okText="保存"
      cancelText="取消"
      destroyOnClose
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical">
          <Form.Item
            name="cover_aspect_ratio"
            label="小程序首页封面长宽比"
            rules={[{ required: true }]}
            extra="影响小程序首页卡片封面的展示比例，不影响原图大小"
          >
            <Radio.Group optionType="button" buttonStyle="solid">
              {COVER_RATIO_OPTIONS.map((o) => (
                <Radio.Button key={o.value} value={o.value}>
                  {o.label}
                </Radio.Button>
              ))}
            </Radio.Group>
          </Form.Item>

          <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
            提示：小程序端在首页 onLoad 和下拉刷新时读取，已经打开页面的用户不会立即看到变化。
          </Typography.Paragraph>
        </Form>
      </Spin>
    </Modal>
  );
}
