<?php
require_once __DIR__ . '/env.php';

/**
 * 获取 SMTP 配置信息
 *
 * @return array
 */
function getSmtpConfig() {
    return array(
        'server' => envValue('SMTP_SERVER', 'smtp.163.com'),
        'port' => (int) envValue('SMTP_PORT', '587'),
        'username' => envValue('SMTP_USERNAME', ''),
        'password' => envValue('SMTP_PASSWORD', ''),
        'from_email' => envValue('SMTP_FROM_EMAIL', envValue('SMTP_USERNAME', '')),
        'from_name' => envValue('SMTP_FROM_NAME', '寒枫')
    );
}
?>
