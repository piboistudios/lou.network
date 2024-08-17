function fallback(k, v) {
    if (!process.env[k]) process.env[k] = v;
}

fallback("BASE_URL", "https://lou.network");