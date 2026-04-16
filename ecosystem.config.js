module.exports = {
  apps: [
    {
      name: 'prompts-app',
      script: './node_modules/.bin/tsx',
      args: 'server.ts',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/root/.pm2/logs/prompts-app-error.log',
      out_file: '/root/.pm2/logs/prompts-app-out.log'
    }
  ]
};
