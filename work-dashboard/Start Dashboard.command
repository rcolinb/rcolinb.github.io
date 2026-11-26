#!/bin/zsh
cd -- "${0:A:h}"
exec /usr/bin/python3 -m server.app --port 8767
