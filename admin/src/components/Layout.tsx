import { useState } from 'react';
import { Layout as AntLayout, Menu, Button, Space, Typography, Tooltip } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { clearToken } from '../api/client';
import SettingsModal from './SettingsModal';

const { Header, Sider, Content } = AntLayout;

export default function Layout() {
  const navigate = useNavigate();
  const loc = useLocation();
  const active = loc.pathname.startsWith('/articles') ? 'articles' : '';
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={200}>
        <div style={{ color: '#fff', textAlign: 'center', padding: 16, fontSize: 18 }}>
          上传 · 管理后台
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[active]}
          onClick={(e) => navigate(`/${e.key}`)}
          items={[{ key: 'articles', label: '内容管理' }]}
        />
      </Sider>
      <AntLayout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>内容管理</Typography.Title>
          <Space>
            <Tooltip title="系统设置">
              <Button
                type="text"
                icon={<SettingOutlined />}
                onClick={() => setSettingsOpen(true)}
              />
            </Tooltip>
            <Button
              onClick={() => {
                clearToken();
                navigate('/login', { replace: true });
              }}
            >
              退出登录
            </Button>
          </Space>
        </Header>
        <Content style={{ margin: 16, padding: 16, background: '#fff', borderRadius: 8 }}>
          <Outlet />
        </Content>
      </AntLayout>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </AntLayout>
  );
}
