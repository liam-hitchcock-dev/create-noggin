#!/bin/bash
# Test create-noggin with automated inputs
# Clean up any previous test
rm -rf /tmp/test-noggin

printf '/tmp/test-noggin\nn\nn\nn\n' | node bin/create-noggin.js
