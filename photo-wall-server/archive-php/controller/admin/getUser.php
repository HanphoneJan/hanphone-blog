<?php
// 获取用户列表的接口，只有管理员可以访问
// 使用 getDbConnection 函数获取数据库连接
require_once '/www/server_atlas/config/db_connect.php';
// 设置返回类型为 JSON
header('Content-Type: application/json');


$conn = getDbConnection();

$sql = "SELECT * FROM user";
$result = $conn->query($sql);

if ($result->num_rows > 0) {
    $data = array();
    while($row = $result->fetch_assoc()) {
        $data[] = array(
            "username" => $row['username'],
            "email" =>  $row['email'],
            "is_admin" => $row['is_admin']
        );
    }
    echo json_encode(array("message" => "查询成功", "status" => 830, "data" => $data));
} else {
    echo json_encode(array("message" => "没有数据", "status" => 0, "data" => array()));
}

$conn->close();
exit;
?>
