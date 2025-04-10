# Генерация сертификатов HTTPS

Для генерации самоподписанных сертификатов выполните следующую команду:

```
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

Сохраните `key.pem` и `cert.pem` в этой папке.
