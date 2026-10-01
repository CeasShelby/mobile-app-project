<?php
// 1. First get token for parent@example.com
$ch = curl_init('https://mobile-app-project-i4su.onrender.com/api/auth/login.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'email' => 'parent@example.com',
    'password' => 'password'
]));
$res = curl_exec($ch);
curl_close($ch);

$data = json_decode($res, true);
$token = $data['data']['token'] ?? null;

if (!$token) {
    die("Failed to login: $res\n");
}

echo "[1] Successfully logged in! JWT Token acquired.\n";

// 2. Call parent dashboard API endpoint with JWT Bearer Token
$ch = curl_init('https://mobile-app-project-i4su.onrender.com/api/parent/dashboard.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $token
]);
$dashRes = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP CODE: $httpCode\n";
echo "DASHBOARD RESPONSE:\n$dashRes\n";
