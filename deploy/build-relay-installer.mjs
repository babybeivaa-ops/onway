import fs from 'node:fs';
const relay=fs.readFileSync(new URL('./oracle-relay.py',import.meta.url),'utf8');
const installer=String.raw`#!/usr/bin/env python3
import base64, getpass, grp, json, os, pathlib, secrets, shutil, ssl, subprocess, time
import urllib.parse, urllib.request

RELAY = base64.b64decode('__PAYLOAD__').decode('utf-8')
compile(RELAY, 'relay.py', 'exec')
if os.geteuid() != 0:
    raise SystemExit('Run: sudo python3 install-onway-relay.py')
if not shutil.which('openssl'):
    raise SystemExit('First run: sudo dnf install -y openssl')
root = pathlib.Path('/etc/onway-relay')
config_file = root / 'config.json'
if config_file.exists():
    config = json.loads(config_file.read_text())
else:
    key = os.environ.get('ITS_API_KEY', '').strip() or getpass.getpass('ITS API KEY (hidden): ').strip()
    if not key:
        raise SystemExit('Empty ITS key; nothing installed.')
    config = {'its_key': key, 'token': secrets.token_urlsafe(48)}

# Verify authorization before installing anything. Never print key-bearing URLs.
params = dict(apiKey=config['its_key'], type='all', eventType='all', getType='json', minX='127', maxX='128', minY='34', maxY='35')
try:
    with urllib.request.urlopen('https://openapi.its.go.kr:9443/eventInfo?' + urllib.parse.urlencode(params), timeout=20) as r:
        result = json.load(r)
    if str(result.get('header', {}).get('resultCode')) != '0':
        raise ValueError('ITS rejected request')
except Exception:
    raise SystemExit('ITS authorization check failed; nothing installed. Check key and allowed IP.')

namespace = {'__name__': 'relay_test'}
exec(compile(RELAY, 'relay.py', 'exec'), namespace)
validate = namespace['bounds_from_query']
assert validate('minX=127&maxX=128&minY=34&maxY=35')['minX'] == '127.0'
for query in ['minX=nan&maxX=128&minY=34&maxY=35', 'minX=127&maxX=128&minY=34&maxY=35&url=https://example.com', 'minX=127&minX=126&maxX=128&minY=34&maxY=35']:
    try:
        validate(query)
    except ValueError:
        pass
    else:
        raise SystemExit('Validation self-test failed')

if subprocess.run(['id', 'onway-relay'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode:
    subprocess.run(['useradd', '--system', '--user-group', '--no-create-home', '--shell', '/sbin/nologin', 'onway-relay'], check=True)
gid = grp.getgrnam('onway-relay').gr_gid
root.mkdir(mode=0o750, exist_ok=True)
os.chown(root, 0, gid)
os.chmod(root, 0o750)
config_file.write_text(json.dumps(config))
os.chown(config_file, 0, gid)
os.chmod(config_file, 0o640)
app = pathlib.Path('/opt/onway-relay')
app.mkdir(mode=0o755, exist_ok=True)
(app / 'relay.py').write_text(RELAY)
os.chmod(app / 'relay.py', 0o644)
if not (root / 'server.crt').exists():
    subprocess.run(['openssl', 'req', '-x509', '-newkey', 'rsa:3072', '-sha256', '-nodes', '-days', '365', '-keyout', str(root / 'server.key'), '-out', str(root / 'server.crt'), '-subj', '/CN=onway-traffic-relay', '-addext', 'subjectAltName=IP:129.225.170.100', '-addext', 'extendedKeyUsage=serverAuth'], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for name in ('server.key', 'server.crt'):
    os.chown(root / name, 0, gid)
    os.chmod(root / name, 0o640)
unit = '''[Unit]
Description=ONWAY authenticated ITS HTTPS relay
After=network-online.target
Wants=network-online.target

[Service]
User=onway-relay
Group=onway-relay
ExecStart=/usr/bin/python3 /opt/onway-relay/relay.py
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
LimitNOFILE=256
TasksMax=32
MemoryMax=160M
UMask=0077

[Install]
WantedBy=multi-user.target
'''
pathlib.Path('/etc/systemd/system/onway-relay.service').write_text(unit)
subprocess.run(['systemctl', 'daemon-reload'], check=True)
subprocess.run(['systemctl', 'enable', 'onway-relay'], check=True)
subprocess.run(['systemctl', 'restart', 'onway-relay'], check=True)

# Local TLS self-test includes certificate verification and an authenticated ITS call.
class LocalConnect(urllib.request.HTTPSHandler):
    pass
context = ssl.create_default_context(cafile=str(root / 'server.crt'))
# Loopback connection with explicit certificate identity check for the public IP.
import http.client, socket
def local_get(path, authorized=True):
    connection = http.client.HTTPSConnection('129.225.170.100', 8443, context=context, timeout=20)
    connection.connect = lambda: setattr(connection, 'sock', context.wrap_socket(socket.create_connection(('127.0.0.1', 8443), timeout=20), server_hostname='129.225.170.100'))
    try:
        connection.request('GET', path, headers={'Authorization': 'Bearer ' + config['token']} if authorized else {})
        response = connection.getresponse()
        return response.status, json.loads(response.read())
    finally:
        connection.close()
for attempt in range(10):
    try:
        status, body = local_get('/healthz', False)
        if status == 200:
            break
    except OSError:
        time.sleep(1)
else:
    raise SystemExit('Service did not start. Run: sudo systemctl status onway-relay --no-pager')
assert local_get('/eventInfo?minX=127&maxX=128&minY=34&maxY=35', False)[0] == 401
assert local_get('/eventInfo?url=https://example.com')[0] == 400
status, body = local_get('/eventInfo?minX=127&maxX=128&minY=34&maxY=35')
if status != 200 or str(body.get('header', {}).get('resultCode')) != '0':
    raise SystemExit('Relay installed but authenticated ITS self-test failed.')

# Host firewall: accept only the previously verified Render Singapore outbound ranges.
if shutil.which('firewall-cmd') and subprocess.run(['firewall-cmd', '--state'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0:
    for cidr in ('74.220.52.0/24', '74.220.60.0/24'):
        rule = 'rule family="ipv4" source address="' + cidr + '" port port="8443" protocol="tcp" accept'
        subprocess.run(['firewall-cmd', '--permanent', '--add-rich-rule=' + rule], check=True)
        subprocess.run(['firewall-cmd', '--add-rich-rule=' + rule], check=True)

# Contains a bearer token: root-only, never printed automatically.
env = pathlib.Path('/etc/onway-relay/render.env')
env.write_text('ITS_RELAY_URL=https://129.225.170.100:8443/eventInfo\nITS_RELAY_TOKEN=' + config['token'] + '\nITS_RELAY_CA_PEM=' + json.dumps((root / 'server.crt').read_text()) + '\n')
os.chmod(env, 0o600)
print('ONWAY_RELAY_OK: TLS, authentication, query restrictions, ITS SUCCESS verified.')
print('Next: OCI ingress TCP 8443 for Render ranges; then configure Render environment.')
print('Render settings saved privately at /etc/onway-relay/render.env (do not share screenshots of contents).')
`;
const output=process.argv[2];
if(!output) throw Error('Output file required');
fs.writeFileSync(output,installer.replace('__PAYLOAD__',Buffer.from(relay).toString('base64')));
console.log('Installer generated without credentials.');
