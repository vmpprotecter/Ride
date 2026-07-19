#!/bin/bash
# Ride IDE — launcher
cd "$(dirname "$0")"
npx electron . "$@"
