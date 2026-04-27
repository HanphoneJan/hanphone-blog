<?php
// 切换用户类型的接口，管理员权限
require_once '/www/server_atlas/config/db_connect.php';

// 设置返回类型为 JSON
header('Content-Type: application/json');
// 获取请求中的数据，json解码默认是字符串
$data = json_decode(file_get_contents('php://input'), true);

// 检查username是否存在并验证其值
if (isset($data['user']['username'])) {
    $username = $data['user']['username'];

    // 连接数据库
    $conn = getDbConnection();

    if ($conn === false) {
        echo json_encode(array("message" => "无法连接到数据库", "status" => 0));
        exit;
    }

    // 查询用户的当前type值
    $stmt = $conn->prepare("SELECT `is_admin` FROM user WHERE username = ?");
    if ($stmt === false) {
        echo json_encode(array("message" => "数据库查询准备失败", "status" => 0));
        $conn->close();
        exit;
    }

    $stmt->bind_param("s", $username);
    $stmt->execute();
    $stmt->store_result();
    $stmt->bind_result($currentType);

    if ($stmt->fetch()) {
        // 决定新的type值
        $newType = ($currentType == 0) ? 1 : 0;

        // 准备更新语句
        $updateStmt = $conn->prepare("UPDATE user SET `is_admin` = ? WHERE username = ?");
        if ($updateStmt === false) {
            echo json_encode(array("message" => "数据库更新准备失败", "status" => 0));
            $stmt->close();
            $conn->close();
            exit;
        }

        // 绑定参数并执行更新
        $updateStmt->bind_param("is", $newType, $username);
        if ($updateStmt->execute()) {
            // 检查受影响的行数
            if ($updateStmt->affected_rows > 0) {
                echo json_encode(array("message" => "用户类型已切换", "status" => 830));
            } else {
                echo json_encode(array("message" => "未找到该记录或没有更改", "status" => 0));
            }
        } else {
            echo json_encode(array("message" => "修改用户类型失败: " . $updateStmt->error, "status" => 0));
        }

        // 关闭更新语句
        $updateStmt->close();
    } else {
        echo json_encode(array("message" => "未找到用户", "status" => 0));
    }

    // 关闭查询语句和连接
    $stmt->close();
    $conn->close();
} else {
    echo json_encode(array("message" => "缺少或无效的用户参数", "status" => 0));
}

?>