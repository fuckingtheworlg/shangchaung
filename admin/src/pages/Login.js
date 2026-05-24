import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Form, Input, Button, Card, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { login } from '../api/auth';
export default function Login() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const onFinish = async (values) => {
        setLoading(true);
        try {
            await login(values.username, values.password);
            message.success('登录成功');
            navigate('/articles', { replace: true });
        }
        catch {
            // 错误已由 axios 拦截器提示
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { style: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }, children: _jsx(Card, { title: "\u4E0A\u4F20 \u00B7 \u7BA1\u7406\u540E\u53F0\u767B\u5F55", style: { width: 380 }, children: _jsxs(Form, { layout: "vertical", onFinish: onFinish, initialValues: { username: 'admin' }, children: [_jsx(Form.Item, { name: "username", label: "\u7528\u6237\u540D", rules: [{ required: true }], children: _jsx(Input, { autoComplete: "username" }) }), _jsx(Form.Item, { name: "password", label: "\u5BC6\u7801", rules: [{ required: true }], children: _jsx(Input.Password, { autoComplete: "current-password" }) }), _jsx(Form.Item, { children: _jsx(Button, { type: "primary", htmlType: "submit", loading: loading, block: true, children: "\u767B\u5F55" }) })] }) }) }));
}
