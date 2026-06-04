<?php
require_once __DIR__ . '/env.php';

if (!defined('SECRET_KEY')) {
    define('SECRET_KEY', envValue('SECRET_KEY', 'change-me'));
}

if (!defined('INTERNAL_PATH')) {
    define('INTERNAL_PATH', envValue('INTERNAL_PATH', '/www/server_atlas/atlas/'));
}

if (!defined('EXTERN_PATH')) {
    define('EXTERN_PATH', envValue('EXTERN_PATH', 'https://hanphone.top/storage/atlas'));
}

if (!defined('JWT_ISSUER')) {
    define('JWT_ISSUER', envValue('JWT_ISSUER', 'Hanphone'));
}

if (!defined('JWT_AUDIENCE')) {
    define('JWT_AUDIENCE', envValue('JWT_AUDIENCE', 'Friends'));
}
?>
