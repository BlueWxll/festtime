<?php
// Proxy Webcup pour l'hébergement statique (Apache/PHP) — équivalent de /api/requests dans server.js
// La clé vient de api/key.php, généré au déploiement par build.sh à partir de la variable API_KEY
$keyFile = __DIR__ . '/key.php';
$API_KEY = getenv('API_KEY') ?: (is_file($keyFile) ? require $keyFile : '');
$WEBCUP_API_URL = 'https://24h.webcup.fr/wp-json/webcup/v1/requests';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if (!$API_KEY) {
    http_response_code(500);
    echo json_encode(['error' => 'Clé API non configurée (api/key.php absent)']);
    exit;
}

$headers = [
    'X-Webcup-Api-Key: ' . $API_KEY,
    'Accept: application/json',
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) TerraNovaPlatform/1.0'
];

$body = false;
$status = 502;

if (function_exists('curl_init')) {
    $ch = curl_init($WEBCUP_API_URL);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_FOLLOWLOCATION => true
    ]);
    $body = curl_exec($ch);
    if ($body !== false) {
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    }
    curl_close($ch);
} else {
    $context = stream_context_create(['http' => [
        'method' => 'GET',
        'header' => implode("\r\n", $headers),
        'timeout' => 10,
        'ignore_errors' => true
    ]]);
    $body = @file_get_contents($WEBCUP_API_URL, false, $context);
    if ($body !== false && isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
        $status = (int) $m[1];
    }
}

if ($body === false) {
    http_response_code(503);
    echo json_encode(['error' => 'Impossible de contacter l\'API Webcup']);
    exit;
}

if (json_decode($body) === null) {
    http_response_code(502);
    echo json_encode(['error' => 'Réponse JSON invalide reçue de l\'API Webcup']);
    exit;
}

http_response_code($status);
echo $body;
