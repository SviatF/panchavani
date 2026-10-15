import unittest
import hmac,hashlib
from io import BytesIO
from urllib.error import HTTPError
from unittest.mock import patch
from panchavani.private_runner import _signed_headers,post,RunnerError

class TestPrivateRunner(unittest.TestCase):
 def test_signed_headers_include_sha_body(self):
  with patch('panchavani.private_runner.time.time',return_value=1760000000.0),patch('panchavani.private_runner.uuid.uuid4',return_value='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'):
   body=b'{}'; headers=_signed_headers('s'*40,'POST','/internal/runner/claim',body)
  expected='1760000000000\naaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee\nPOST\n/internal/runner/claim\n'+hashlib.sha256(body).hexdigest()
  self.assertEqual(headers['X-Panchavani-Signature'],hmac.new(('s'*40).encode(),expected.encode(),hashlib.sha256).hexdigest())
 def test_reject_any_untrusted_admin_hostname(self):
  with self.assertRaises(RunnerError):
   post('https://evil.com','/internal/runner/claim',{},hmac_key='s'*40,access_id='x',access_secret='y')
 def test_worker_hmac_403_is_classified_without_logging_raw_response(self):
  error=HTTPError('https://admin.panchavani.com/internal/runner/claim',403,'Forbidden',{'Content-Type':'application/json'},BytesIO(b'{"error":"access_denied","private":"do-not-print"}'))
  class Opener:
   def open(self,*_args,**_kwargs):
    raise error
  with patch('panchavani.private_runner.build_opener',return_value=Opener()):
   with self.assertRaises(RunnerError) as raised:
    post('https://admin.panchavani.com','/internal/runner/claim',{},hmac_key='s'*40,access_id='x',access_secret='y')
  self.assertIn('diagnostic=access_denied',str(raised.exception))
  self.assertNotIn('do-not-print',str(raised.exception))
 def test_non_json_access_403_has_safe_edge_diagnostic(self):
  error=HTTPError('https://admin.panchavani.com/internal/runner/claim',403,'Forbidden',{'Content-Type':'text/html'},BytesIO(b'<html>PRIVATE KEY</html>'))
  class Opener:
   def open(self,*_args,**_kwargs):
    raise error
  with patch('panchavani.private_runner.build_opener',return_value=Opener()):
   with self.assertRaises(RunnerError) as raised:
    post('https://admin.panchavani.com','/internal/runner/claim',{},hmac_key='s'*40,access_id='x',access_secret='y')
  self.assertIn('non_json_rejection_check_Cloudflare_Access_or_edge',str(raised.exception))
  self.assertNotIn('PRIVATE KEY',str(raised.exception))
if __name__=='__main__':
 unittest.main()
