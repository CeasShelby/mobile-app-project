<?php

class JWTHelper {
    // Secret key used to sign the token signature. Must match what is in the server configuration.
    private static $secret = 'parent_teacher_secret_key_123!';

    // Base64URL Encoding: Standard base64 contains '+', '/' and '=' which are not URL-safe.
    // We swap '+' with '-', '/' with '_', and strip '=' trailing paddings.
    private static function base64url_encode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    // Base64URL Decoding: Restores the standard characters to decode back to JSON.
    private static function base64url_decode($data) {
        return base64_decode(strtr($data, '-_', '+/'));
    }

    // Generate a secure JWT Token
    public static function generate_jwt($payload) {
        // Set token expiration (30 days from now)
        $payload['exp'] = time() + (30 * 24 * 60 * 60);

        // Header describes the token type (JWT) and the hashing algorithm used (HS256 = HMAC SHA256)
        $header = json_encode(['alg' => 'HS256', 'typ' => 'JWT']);

        // Convert the Header and Payload into Base64URL strings
        $base64UrlHeader = self::base64url_encode($header);
        $base64UrlPayload = self::base64url_encode(json_encode($payload));

        // Create the HMAC signature using SHA256 and the secret key
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::$secret, true);
        $base64UrlSignature = self::base64url_encode($signature);

        // Combine into the standard header.payload.signature format
        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    // Verify and decode a JWT Token
    public static function verify_jwt($token) {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return false; // Invalid token structure
        }

        list($base64UrlHeader, $base64UrlPayload, $base64UrlSignature) = $parts;

        // Recreate the signature using the header & payload we received, and our private secret key
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::$secret, true);
        $expectedSignature = self::base64url_encode($signature);

        // Compare the signatures. We use hash_equals() instead of "==" because it protects against
        // timing attacks (preventing attackers from guessing signature characters by measuring latency).
        if (!hash_equals($expectedSignature, $base64UrlSignature)) {
            return false; // Signature mismatch (the data has been altered)
        }

        // Decode the payload back into an associative array
        $payload = json_decode(self::base64url_decode($base64UrlPayload), true);

        // Check if the token has expired
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return false; // Token expired
        }

        return $payload; // Return decoded user details
    }
}
