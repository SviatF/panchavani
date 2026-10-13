import unittest
import hmac,hashlib
from unittest.mock import patch
from panchavani.private_runner import _signed_headers,post,RunnerError

class TestPrivateRunner(unittest.TestCase):
 def test_signed_headers_include_sha_body(self):
  with patch('panchavani.private_runner.time.time',return_value=1760000000.0),patch('panchavani.private_runner.uuid.uuid4',return_value='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'):
   body=b'{}'; headers=_signed_headers('s'*40,'POST','/internal/runner/claim',body)
  expected='1760000000000\\naaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee\\nPOST\\n/internal/runner/claim\\n'+hashlib.sha256(body).hexdigest()
  self.assertEqual(headers['X-Panchavani-Signature'],hmac.new(('s'*40).encode(),expected.encode(),hashlib.sha256).hexdigest())
 def test_reject_any_untrusted_admin_hostname(self):
  with self.assertRaises(RunnerError):
   post('https://evil.com','/internal/runner/claim',{},hmac_key='s'*40,access_id='x',access_secret='y')
if __name__=='__main__':
 unittest.main()
