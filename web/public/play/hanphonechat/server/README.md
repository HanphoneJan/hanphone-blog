### TL;DR
```shell
pip install -r requirements.txt
python hanphonechat.py
```

### Use a venv:

```shell
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
```

### Call
```curl
curl --location 'http://127.0.0.1:8830/chat_with_hanphone' \
--header 'Content-Type: application/json' \
--data '{
    "message": "早上好"
}'

curl --location 'http://127.0.0.1:8830/chat_with_hanphone' \
--header 'Content-Type: application/json' \
--data '{
    "message": "早上好"
}'
```


