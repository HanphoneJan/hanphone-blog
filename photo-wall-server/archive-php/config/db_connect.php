<?php
require_once __DIR__ . '/env.php';

/**
 * 获取数据库连接
 *
 * @throws Exception 如果数据库连接失败
 * @return mysqli
 */
function getDbConnection() {
    $servername = envValue('DB_HOST', 'localhost');
    $username = envValue('DB_USER', 'root');
    $password = envValue('DB_PASSWORD', '');
    $database = envValue('DB_NAME', 'atlas');
    $port = (int) envValue('DB_PORT', '3306');

    $conn = new mysqli($servername, $username, $password, $database, $port);

    if ($conn->connect_error) {
        throw new Exception("数据库连接失败: " . $conn->connect_error);
    }

    return $conn;
}
?>
