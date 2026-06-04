<?php
require_once '/www/server_atlas/config/db_connect.php';
require_once '/www/server_atlas/config/config.php';

// 设置返回类型为 JSON
header('Content-Type: application/json');

// 文件类型和大小设置
$allowed_types = array('image/jpeg','image/jpg', 'image/png','image/webp', 'image/gif','image/*', 'video/mp4', 'video/webm', 'video/ogg' );
$max_size = 100 * 1024 * 1024; // 100MB

// 获取 POST 请求中的表单数据
$author = isset($_POST['author']) ? $_POST['author'] : '';
$username = isset($_POST['username']) ? $_POST['username'] : '';
$description = isset($_POST['description']) ? $_POST['description'] : '';
$title = isset($_POST['title']) && !empty($_POST['title']) ? $_POST['title'] : 'Untitled'; // 默认标题
$filepath = INTERNAL_PATH;  // 文件保存路径

// 处理每个上传的文件
$files = $_FILES['files']; // 获取上传的文件
foreach ($files['name'] as $index => $file_name) {
    $file_type = $files['type'][$index];
    $file_size = $files['size'][$index];
    $tmp_name = $files['tmp_name'][$index];

    // 检查文件大小
    if ($file_size > $max_size) {
        $upload_results = array("status" => 0, "message" => "文件大小超过限制", "file" => $file_name);
        continue;
    }

    // 检查文件类型
    if (!in_array($file_type, $allowed_types)) {
        $upload_results = array("status" => 0, "message" => "文件格式不支持", "file" => $file_name);
        continue;
    }

    // 生成文件外链
    $file_url = EXTERN_PATH . '/' . $file_name;

    // 移动上传的文件到目标文件夹
    if (move_uploaded_file($tmp_name, $filepath . $file_name)) {
        // 使用 getDbConnection 函数获取数据库连接
        $conn = getDbConnection();

        // 获取当前时间并生成唯一ID
        $current_time = date('Y-m-d H:i:s');
        $unique_id = str_replace(['-', ' ', ':'], '', $current_time) . rand(100000, 999999);

        // 插入数据库
        $sql = "INSERT INTO files (id, path, author, description, title, type, upload_time, likes, username) 
                VALUES ('$unique_id', '$file_url', '$author', '$description', '$title', 0, '$current_time', 0,'$username')";
        
        if ($conn->query($sql) === TRUE) {
            http_response_code(200);
            $upload_results = array("status" => 830, "message" => "上传成功", "file" => $file_name);
        } else {
            $upload_results = array("status" => 0, "message" => "上传成功，但保存路径到数据库失败: " . $conn->error, "file" => $file_name);
        }
        $conn->close();
    } else {
        $upload_results = array("status" => 0, "message" => "上传失败", "file" => $file_name);
    }
}

// 返回上传结果
echo json_encode($upload_results);
exit;
?>
