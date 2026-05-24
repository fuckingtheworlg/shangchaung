import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Layout as AntLayout, Menu, Button, Space, Typography } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { clearToken } from '../api/client';
const { Header, Sider, Content } = AntLayout;
export default function Layout() {
    const navigate = useNavigate();
    const loc = useLocation();
    const active = loc.pathname.startsWith('/articles') ? 'articles' : '';
    return (_jsxs(AntLayout, { style: { minHeight: '100vh' }, children: [_jsxs(Sider, { theme: "dark", width: 200, children: [_jsx("div", { style: { color: '#fff', textAlign: 'center', padding: 16, fontSize: 18 }, children: "\u4E0A\u4F20 \u00B7 \u7BA1\u7406\u540E\u53F0" }), _jsx(Menu, { theme: "dark", mode: "inline", selectedKeys: [active], onClick: (e) => navigate(`/${e.key}`), items: [{ key: 'articles', label: '内容管理' }] })] }), _jsxs(AntLayout, { children: [_jsxs(Header, { style: { background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx(Typography.Title, { level: 4, style: { margin: 0 }, children: "\u5185\u5BB9\u7BA1\u7406" }), _jsx(Space, { children: _jsx(Button, { onClick: () => {
                                        clearToken();
                                        navigate('/login', { replace: true });
                                    }, children: "\u9000\u51FA\u767B\u5F55" }) })] }), _jsx(Content, { style: { margin: 16, padding: 16, background: '#fff', borderRadius: 8 }, children: _jsx(Outlet, {}) })] })] }));
}
