#!/usr/bin/python
#
# -*- coding: utf-8 -*-
# vim: set ts=4 sw=4 et sts=4 ai:

import atexit
import sys
import os
import platform
import pprint

import argparse
parser = argparse.ArgumentParser()
parser.add_argument(
    "-b", "--browser", type=str, required=True,
    choices=['Firefox', 'Chrome', 'Ie', 'PhantomJS', 'Remote'],
    help="Which WebDriver to use.")
parser.add_argument(
    "-x", "--virtual", action='store_true', default=False,
    help="Use a virtual screen system such as Xvfb, Xephyr or Xvnc.")
parser.add_argument(
    "-d", "--dontexit", action='store_true', default=False,
    help="At end of testing, don't exit.")

parser.add_argument(
    "-a", "--auto-install", action='store_true', default=True,
    help="Auto install any dependencies.")

# Subunit / testrepository support
parser.add_argument(
    "--subunit", action='store_true', default=False,
    help="Output raw subunit binary data.")
parser.add_argument(
    "--list", action='store_true', default=False,
    help="List tests which are avalible.")
parser.add_argument(
    "--load-list", type=argparse.FileType('r'),
    help="List of tests to run.")

args = parser.parse_args()

# Make sure the repository is setup and the dependencies exist
# -----------------------------------------------------------------------------

import subprocess

# Set up the git repository
if args.auto_install:
    subprocess.check_call(["git", "submodule", "init"])
    subprocess.check_call(["git", "submodule", "update"])

# Install the python modules
def autoinstall(name, package=None):
    if not package:
        package = name

    try:
        exec("import %s" % name)
    except ImportError:
	if not subprocess.check_call(["pip", "install", "--user", package]):
	    raise SystemExit("Unable to install %s" % package)

	import sys, os
	python = sys.executable
	os.execl(python, python, *sys.argv)

if args.auto_install:
    autoinstall("subunit", "python-subunit")
    autoinstall("pyvirtualdisplay")
    autoinstall("selenium")

# Get any selenium drivers we might need
if args.browser == "Chrome":
    # Get ChromeDriver if it's not in the path...
    # https://code.google.com/p/chromedriver/downloads/list
    chromedriver_bin = None
    if platform.system() == "Linux":
        chromedriver_bin = "chromedriver"
        if platform.processor() == "x86_64":
            # 64 bit binary needed
            chromedriver_url = "https://chromedriver.googlecode.com/files/chromedriver2_linux64_0.6.zip"
        else:
            # 32 bit binary needed
            chromedriver_url = "https://chromedriver.googlecode.com/files/chromedriver_linux32_26.0.1383.0.zip"

    elif platform.system() == "mac":
        chromedriver_url = "https://chromedriver.googlecode.com/files/chromedriver2_mac32_0.7.zip"
        chromedriver_bin = "chromedriver"
    elif platform.system() == "win32":
        chromedriver_bin = "https://chromedriver.googlecode.com/files/chromedriver2_win32_0.7.zip"
        chromedriver_url = "chromedriver.exe"

    try:
        if subprocess.call(chromedriver_bin) != 0:
            raise OSError("Return code?")
    except OSError:
        chromedriver_local = os.path.join("tools", chromedriver_bin)

        if not os.path.exists(chromedriver_local):
            import urllib2, zipfile
            import cStringIO as StringIO
            datafile = StringIO.StringIO(urllib2.urlopen(chromedriver_url).read())
            contents = zipfile.ZipFile(datafile, 'r')
            contents.extract(chromedriver_bin, "tools")

        chromedriver = os.path.realpath(chromedriver_local)
        os.chmod(chromedriver, 0755)
    else:
        chromedriver = "chromedriver"

elif args.browser == "Firefox":
    pass

elif args.browser == "PhantomJS":
    phantomjs_bin = None
    if platform.system() == "Linux":
        phantomjs_bin = "phantomjs"
        if platform.processor() == "x86_64":
            # 64 bit binary needed
            phantomjs_url = "https://phantomjs.googlecode.com/files/phantomjs-1.9.0-linux-x86_64.tar.bz2"
        else:
            # 32 bit binary needed
            phantomjs_url = "https://phantomjs.googlecode.com/files/phantomjs-1.9.0-linux-i686.tar.bz2"

        phantomjs_local = os.path.join("tools", phantomjs_bin)
        if not os.path.exists(phantomjs_local):
            import urllib2, tarfile
            import cStringIO as StringIO
            datafile = StringIO.StringIO(urllib2.urlopen(phantomjs_url).read())
            contents = tarfile.TarFile.open(fileobj=datafile, mode='r:bz2')
            file("tools/"+phantomjs_bin, "w").write(
                contents.extractfile("phantomjs-1.9.0-linux-x86_64/bin/"+phantomjs_bin).read())

        phantomjs = os.path.realpath(phantomjs_local)
        os.chmod(phantomjs, 0755)
    else:
        if platform.system() == "mac":
            phantomjs_url = "https://phantomjs.googlecode.com/files/phantomjs-1.9.0-macosx.zip"
            phantomjs_bin = "phantomjs"

        elif platform.system() == "win32":
            chromedriver_bin = "https://phantomjs.googlecode.com/files/phantomjs-1.9.0-windows.zip"
            phantomjs_url = "phantomjs.exe"

        phantomjs_local = os.path.join("tools", phantomjs_bin)
        if not os.path.exists(phantomjs_local):
            import urllib2, zipfile
            import cStringIO as StringIO
            datafile = StringIO.StringIO(urllib2.urlopen(phantomjs_url).read())
            contents = zipfile.ZipFile(datafile, 'r')
            contents.extract(phantomjs_bin, "tools")

        phantomjs = os.path.realpath(phantomjs_local)
        os.chmod(phantomjs, 0755)

# -----------------------------------------------------------------------------

try:
    import subunit
except ImportError:
    print "Please install the Python subunit module."
    print "  sudo pip install python-subunit"
    sys.exit(-1)

if args.list:
    for test in simplejson.loads(
            file("test/testcases.js").read()[len("var tests = "):]):
        print test[:-5]
    sys.exit(-1)

if args.load_list:
    tests = args.load_list.readlines()
else:
    tests = []

if not args.subunit:
    # Human readable test output
    import testtools, unittest
    #output = testtools.StreamToExtendedDecorator(
    #    unittest.TextTestResult(
    #        unittest.runner._WritelnDecorator(sys.stdout), True, 2))
    output = testtools.StreamToExtendedDecorator(
        testtools.TextTestResult(sys.stdout))
else:
    from subunit.v2 import StreamResultToBytes
    output = StreamResultToBytes(sys.stdout)

output.startTestRun()

# Start up a local HTTP server which serves the files to the browser and
# collects the test results.
# -----------------------------------------------------------------------------
import SimpleHTTPServer
import SocketServer
import threading
import cgi
import simplejson

class ServerHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):
    STATUS = {0:'success', 1:'fail', 2:'fail', 3:'skip'}

    # Make the HTTP requests be quiet
    def log_message(self, format, *args):
        pass

    def do_POST(self):
        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={'REQUEST_METHOD':'POST',
                     'CONTENT_TYPE':self.headers['Content-Type'],
                     })

        data = simplejson.loads(form.getvalue('data'))

        for result in data['results']:
            output.status(
                test_id="%s.%s" % (data['testName'][:-5], result['name']),
                test_status=self.STATUS[result['status']],
                test_tags=[args.browser],
#                file_name=,
#                file_bytes='',

                eof=True)

        SimpleHTTPServer.SimpleHTTPRequestHandler.do_GET(self)

httpd = SocketServer.TCPServer(
    ("127.0.0.1", 0),  # Bind to any port on localhost
    ServerHandler)
httpd_thread = threading.Thread(target=httpd.serve_forever)
httpd_thread.daemon = True
httpd_thread.start()

port = httpd.socket.getsockname()[-1]

# Start up a virtual display, useful for testing on headless servers.
# -----------------------------------------------------------------------------

if args.virtual:
    try:
        from pyvirtualdisplay.smartdisplay import SmartDisplay
    except ImportError:
        print "Please install the Python pyvirtualdisplay module."
        print "  sudo pip install pyvirtualdisplay"
        sys.exit(-1)

    disp = None
    try:
        disp = SmartDisplay(visible=0, bgcolor='black').start()
        atexit.register(disp.stop)
    except:
        if disp:
            disp.stop()


# Start up the web browser and run the tests.
# ----------------------------------------------------------------------------

try:
    from selenium import webdriver
except ImportError:
    print "Please install the Python selenium module."
    print "  sudo pip install selenium"
    sys.exit(-1)

driver_arguments = {}
if args.browser == "Chrome":
   import tempfile, shutil

   # We reference shutil to make sure it isn't garbaged collected before we use
   # it.
   def directory_cleanup(directory, shutil=shutil):
       try:
           shutil.rmtree(directory)
       except OSError, e:
           pass

   try:
       user_data_dir = tempfile.mkdtemp()
       atexit.register(directory_cleanup, user_data_dir)
   except:
       directory_cleanup(user_data_dir)
       raise

   driver_arguments['chrome_options'] = webdriver.ChromeOptions()
   driver_arguments['chrome_options'].add_argument('--user-data-dir=%s' % user_data_dir)
   driver_arguments['executable_path'] = chromedriver

elif args.browser == "Firefox":
   driver_arguments['firefox_profile'] = webdriver.FirefoxProfile()

elif args.browser == "PhantomJS":
    driver_arguments['executable_path'] = phantomjs
    driver_arguments['service_args'] = ['--remote-debugger-port=9000']

browser = None
try:
    browser = getattr(webdriver, args.browser)(**driver_arguments)
    atexit.register(browser.close)
except:
    if browser:
        browser.close()
    raise

url = 'http://localhost:%i/test/test-runner.html' % port
browser.get(url)

def close_other_windows(browser, url):
    for win in browser.window_handles:
        browser.switch_to_window(win)
        if browser.current_url != url:
            browser.close()
    browser.switch_to_window(browser.window_handles[0])

import time
while True:
    # Sometimes other windows are accidently opened (such as an extension
    # popup), close them.
    if len(browser.window_handles) > 1:
        close_other_windows(browser, url)

    if not browser.execute_script('return window.finished'):
        time.sleep(1)
        continue
    else:
        break

output.stopTestRun()

while args.dontexit:
    time.sleep(30)
