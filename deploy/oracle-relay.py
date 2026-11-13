"""Private, TLS-only ITS event relay. Python 3.9+, no third-party packages."""
import hmac
import json
import math
import ssl
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


def bounds_from_query(query):
    args = urllib.parse.parse_qs(query, keep_blank_values=True)
    fields = ('minX', 'maxX', 'minY', 'maxY')
    if set(args) != set(fields) or any(len(args[f]) != 1 for f in fields):
        raise ValueError('Invalid query')
    values = [float(args[f][0]) for f in fields]
    if not all(math.isfinite(v) for v in values):
        raise ValueError('Invalid bounds')
    x1, x2, y1, y2 = values
    if not (124 <= x1 < x2 <= 132 and 33 <= y1 < y2 <= 39.5):
        raise ValueError('Invalid bounds')
    return dict(zip(fields, map(str, values)))


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class RelayServer(ThreadingHTTPServer):
    daemon_threads = True
    request_queue_size = 16

    def __init__(self, address, config, tls):
        self.config = config
        self.tls = tls
        self.slots = threading.BoundedSemaphore(8)
        self.rate_lock = threading.Lock()
        self.window = time.monotonic()
        self.calls = 0
        self.upstream = urllib.request.build_opener(NoRedirect())
        super().__init__(address, RelayHandler)

    def process_request(self, request, address):
        if not self.slots.acquire(blocking=False):
            request.close()
            return
        try:
            super().process_request(request, address)
        except Exception:
            self.slots.release()
            raise

    def process_request_thread(self, request, address):
        try:
            request.settimeout(20)
            # Handshake in a bounded worker, never block the accept loop.
            with self.tls.wrap_socket(request, server_side=True) as connection:
                self.finish_request(connection, address)
        except Exception:
            pass  # Never log request URLs, authorization headers or provider bodies.
        finally:
            request.close()
            self.slots.release()

    def allow_call(self):
        with self.rate_lock:
            if time.monotonic() - self.window >= 60:
                self.window, self.calls = time.monotonic(), 0
            self.calls += 1
            return self.calls <= 60


class RelayHandler(BaseHTTPRequestHandler):
    server_version = 'ONWAY'
    sys_version = ''

    def log_message(self, *args):
        pass

    def send_json(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parts = urllib.parse.urlsplit(self.path)
        if parts.path == '/healthz' and not parts.query:
            return self.send_json(200, {'ok': True})
        if parts.path != '/eventInfo' or len(self.path) > 1024:
            return self.send_json(404, {'error': 'Not found'})
        expected = ('Bearer ' + self.server.config['token']).encode()
        actual = self.headers.get('Authorization', '').encode()
        if not hmac.compare_digest(actual, expected):
            return self.send_json(401, {'error': 'Unauthorized'})
        try:
            params = bounds_from_query(parts.query)
        except (ValueError, KeyError):
            return self.send_json(400, {'error': 'Invalid bounds'})
        if not self.server.allow_call():
            return self.send_json(429, {'error': 'Rate limited'})
        params.update(apiKey=self.server.config['its_key'], type='all', eventType='all', getType='json')
        url = 'https://openapi.its.go.kr:9443/eventInfo?' + urllib.parse.urlencode(params)
        try:
            try:
                response = self.server.upstream.open(url, timeout=12)
            except urllib.error.HTTPError as error:
                response = error
            with response:
                raw = response.read(4 * 1024 * 1024 + 1)
            if len(raw) > 4 * 1024 * 1024:
                raise ValueError('Large response')
            payload = json.loads(raw)
            if not isinstance(payload, dict) or not isinstance(payload.get('header'), dict):
                raise ValueError('Bad response')
            # Preserve ITS result codes (including quota) without echoing either secret.
            safe = json.dumps(payload, ensure_ascii=False)
            for secret in (self.server.config['its_key'], self.server.config['token'], urllib.parse.quote(self.server.config['its_key'], safe='')):
                safe = safe.replace(secret, '[redacted]')
            return self.send_json(200, json.loads(safe))
        except Exception:
            return self.send_json(502, {'error': 'ITS upstream unavailable'})


if __name__ == '__main__':
    with open('/etc/onway-relay/config.json') as file:
        config = json.load(file)
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    context.load_cert_chain('/etc/onway-relay/server.crt', '/etc/onway-relay/server.key')
    RelayServer(('0.0.0.0', 8443), config, context).serve_forever()
