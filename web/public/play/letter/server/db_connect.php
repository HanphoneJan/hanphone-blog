<?php
/**
 * 获取数据库连接
 *
 * 此函数用于创建并返回一个到指定数据库的 mysqli 连接对象。
 * 连接参数包括服务器名、用户名、密码和数据库名。
 *
 * @return mysqli 返回一个有效的 mysqli 连接对象，如果连接失败则终止脚本执行。
 */
function getDbConnection() {
    $servername = "localhost";
    $username = "hanphone";
    $password = "h17285";
    $database = "letter";

    // 创建连接
    $conn = new mysqli($servername, $username, $password, $database);

    // 检查连接
    if ($conn->connect_error) {
        die("连接失败: " . $conn->connect_error);
    }

    return $conn;
}
?>
