module.exports = {
  apps: [{
    name: 'fund-compare',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/fund-compare',
    
    // 实例配置 (2核2G，单实例更稳定)
    instances: 1,
    exec_mode: 'fork',
    
    // 内存限制 (防止OOM)
    max_memory_restart: '400M',
    node_args: '--max-old-space-size=384',
    
    // 环境变量
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '0.0.0.0',
    },
    
    // 重启策略
    watch: false,
    autorestart: true,
    max_restarts: 10,
    restart_delay: 3000,
    
    // 日志配置
    error_file: '/var/www/fund-compare/logs/error.log',
    out_file: '/var/www/fund-compare/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // 优雅关闭
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
  }]
}
