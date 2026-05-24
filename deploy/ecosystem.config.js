// PM2 配置：在 /var/www/shangchaun 目录下执行 `pm2 start deploy/ecosystem.config.js`
module.exports = {
  apps: [
    {
      name: 'shangchaun-server',
      cwd: './server',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '500M',
      autorestart: true,
      out_file: '../logs/server.out.log',
      error_file: '../logs/server.err.log',
      merge_logs: true,
      time: true,
    },
  ],
};
