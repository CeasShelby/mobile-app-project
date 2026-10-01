<?php
$ch = curl_init('https://mobile-app-project-i4su.onrender.com/api/auth/login.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'email' => 'parent@example.com',
    'password' => 'password'
]));
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP CODE: " . $httpCode . "\n";
echo "RESPONSE BODY:\n" . $response . "\n";
