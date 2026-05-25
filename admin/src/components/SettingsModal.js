import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Modal, Form, Radio, message, Spin, Typography } from 'antd';
import { COVER_RATIO_OPTIONS, getSettings, updateSettings } from '../api/settings';
export default function SettingsModal({ open, onClose }) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    useEffect(() => {
        if (!open)
            return;
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
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsx(Modal, { title: "\u7CFB\u7EDF\u8BBE\u7F6E", open: open, onCancel: onClose, onOk: onOk, confirmLoading: submitting, okText: "\u4FDD\u5B58", cancelText: "\u53D6\u6D88", destroyOnClose: true, children: _jsx(Spin, { spinning: loading, children: _jsxs(Form, { form: form, layout: "vertical", children: [_jsx(Form.Item, { name: "cover_aspect_ratio", label: "\u5C0F\u7A0B\u5E8F\u9996\u9875\u5C01\u9762\u957F\u5BBD\u6BD4", rules: [{ required: true }], extra: "\u5F71\u54CD\u5C0F\u7A0B\u5E8F\u9996\u9875\u5361\u7247\u5C01\u9762\u7684\u5C55\u793A\u6BD4\u4F8B\uFF0C\u4E0D\u5F71\u54CD\u539F\u56FE\u5927\u5C0F", children: _jsx(Radio.Group, { optionType: "button", buttonStyle: "solid", children: COVER_RATIO_OPTIONS.map((o) => (_jsx(Radio.Button, { value: o.value, children: o.label }, o.value))) }) }), _jsx(Typography.Paragraph, { type: "secondary", style: { marginTop: 16, marginBottom: 0 }, children: "\u63D0\u793A\uFF1A\u5C0F\u7A0B\u5E8F\u7AEF\u5728\u9996\u9875 onLoad \u548C\u4E0B\u62C9\u5237\u65B0\u65F6\u8BFB\u53D6\uFF0C\u5DF2\u7ECF\u6253\u5F00\u9875\u9762\u7684\u7528\u6237\u4E0D\u4F1A\u7ACB\u5373\u770B\u5230\u53D8\u5316\u3002" })] }) }) }));
}
