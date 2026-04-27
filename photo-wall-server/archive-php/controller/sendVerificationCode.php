<?php
require_once '/www/server_atlas/config/email_connect.php'; // 引入邮件服务器配置文件
// 设置HTTP响应头为JSON
header('Content-Type: application/json');
//开启session,用于存储验证码
session_start();

/**
 * 发送邮箱验证码
 *
 * 此函数生成一个6位随机验证码，并通过SMTP服务器发送到指定的邮箱地址。
 * 邮件内容包括验证码和相关的邮件头信息。验证码有效期为10分钟。
 *
 * @param string $email 收件人的邮箱地址
 * @return array 返回发送结果，包括状态码和消息
 */
function sendVerificationCode($email) {
    $verification_code = rand(100000, 999999); // 生成6位验证码, 100000 <= verification_code <= 999999

    // 获取 SMTP 配置信息
    $smtp_config = getSmtpConfig();
    $smtp_server = $smtp_config['server'];
    $smtp_port = $smtp_config['port'];
    $smtp_username = $smtp_config['username'];
    $smtp_password = $smtp_config['password'];
    $from_email = $smtp_config['from_email'];
    $from_name = $smtp_config['from_name'];

    // 创建邮件头
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= "From: $from_name <$from_email>" . "\r\n";

    // 创建邮件内容
    $subject = '寒枫的照片墙--邮箱验证码';  //邮件标题
    $message = "您正在注册账号，您的验证码是：<b>$verification_code</b>"; //邮件内容

    // 配置上下文选项以启用加密
    $context_options = array(
        'ssl' => array(
            'verify_peer' => false,  // 禁用对证书的验证
            'verify_peer_name' => false,  // 禁用对证书的验证
            'allow_self_signed' => true  // 允许自签名证书
        )
    );
    // 创建上下文
    $context = stream_context_create($context_options);

    // 连接到 SMTP 服务器,tls协议
    $smtp = stream_socket_client("tls://$smtp_server:$smtp_port", $errno, $errstr, 30, STREAM_CLIENT_CONNECT, $context);
    if (!$smtp) {
        return array("message" => "无法连接到SMTP服务器: $errstr ($errno)");
    }

    // 发送 SMTP 命令
    fputs($smtp, "EHLO $smtp_server\r\n");  // 告诉服务器我们要发送邮件
    fputs($smtp, "AUTH LOGIN\r\n");  // 请求登录 
    fputs($smtp, base64_encode($smtp_username) . "\r\n");  // 发送用户名
    fputs($smtp, base64_encode($smtp_password) . "\r\n");  // 发送密码
    fputs($smtp, "MAIL FROM: <$from_email>\r\n");  // 发送邮件的邮箱地址
    fputs($smtp, "RCPT TO: <$email>\r\n");  // 接收邮件的邮箱地址
    fputs($smtp, "DATA\r\n");  // 准备发送邮件内容
    fputs($smtp, "Subject: $subject\r\n$headers\r\n$message\r\n.\r\n");  // 发送邮件内容
    fputs($smtp, "QUIT\r\n");   // 退出连接

    // 读取 SMTP 服务器响应
    $response = '';
    while (!feof($smtp)) {
        $response .= fgets($smtp, 512);  // 读取响应
    }
    fclose($smtp);

    if (strpos($response, '250') !== false) {
        // 将验证码和过期时间存储在会话中
        $_SESSION['verification_code'] = $verification_code;
        $_SESSION['verification_code_expiry'] = time() + 600; // 验证码有效期10分钟
        return array("status"=>830,"message" => "验证码已发送");
    } else {
        return array("message" => "邮件发送失败");
    }
}

// 获取 POST 请求中的 JSON 数据
$data = json_decode(file_get_contents("php://input"));
if (!isset($data->email) || !filter_var($data->email, FILTER_VALIDATE_EMAIL)) {
    // 返回一个错误响应
    echo json_encode(["error" => "Invalid email address"]);
    exit;
}
else{
    $email = $data->email;
}


$response = sendVerificationCode($email);  // 发送验证码
echo json_encode($response);  // 返回发送结果
?>
