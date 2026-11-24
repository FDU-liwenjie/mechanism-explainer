#!/bin/zsh
set -eu
set -o pipefail

print 'Fish Audio 配音 · 保存到本机登录钥匙串'
print '请在 Fish Audio 的开发者页面复制自己的 API Key：https://fish.audio/app/api-keys/'
python3 - <<'PY'
import getpass
import hmac
import re
import subprocess

key = getpass.getpass('粘贴 Fish Audio API Key，再按回车（输入隐藏）：').strip()
if not re.fullmatch(r'[A-Za-z0-9_.=-]{20,256}', key):
    raise SystemExit('没有收到完整的 Key。请复制官网新建的完整密钥后重试。')
service = 'fish.audio:mechanism-explainer'
account = 'Fish Audio API'
line = f'add-generic-password -U -s "{service}" -a "{account}" -l "Fish Audio - Mechanism Explainer" -w "{key}"\n'
subprocess.run(['/usr/bin/security', '-i'], input=line.encode(), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
stored = subprocess.run(['/usr/bin/security', 'find-generic-password','-s',service,'-a',account,'-w'], capture_output=True)
if stored.returncode or not hmac.compare_digest(stored.stdout.strip(),key.encode()):
    raise SystemExit('钥匙串写入失败，请解锁登录钥匙串后重试。')
print('已验证钥匙串中的值。回到制作对话，请用选定音色试读一句自己的稿件。')
PY
