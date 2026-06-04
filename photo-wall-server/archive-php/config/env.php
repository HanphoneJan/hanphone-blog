<?php

function loadEnvFile($filePath) {
    static $loadedFiles = [];

    if (isset($loadedFiles[$filePath]) || !is_file($filePath)) {
        return;
    }

    $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);

        if ($line === '' || $line[0] === '#') {
            continue;
        }

        $separatorPos = strpos($line, '=');
        if ($separatorPos === false) {
            continue;
        }

        $name = trim(substr($line, 0, $separatorPos));
        $value = trim(substr($line, $separatorPos + 1));

        if ($name === '') {
            continue;
        }

        if (
            (str_starts_with($value, '"') && str_ends_with($value, '"')) ||
            (str_starts_with($value, "'") && str_ends_with($value, "'"))
        ) {
            $value = substr($value, 1, -1);
        }

        if (getenv($name) === false) {
            putenv("$name=$value");
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }

    $loadedFiles[$filePath] = true;
}

function envValue($key, $default = null) {
    $value = getenv($key);
    return $value === false ? $default : $value;
}

loadEnvFile(dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env');
