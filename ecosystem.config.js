module.exports = {
  apps: [
    {
      name: 'prompts-app',
      script: './node_modules/.bin/tsx',
      args: 'server.ts',
      cwd: '/var/www/prompts.neiro-kod.ru',
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
