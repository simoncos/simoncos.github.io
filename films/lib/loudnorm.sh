#!/bin/bash
# Two-pass loudness normalisation: lib/loudnorm.sh in.wav out.wav [LUFS]
# -14 LUFS integrated, -1.5 dBTP, as the site intro video.
set -euo pipefail
in=$1; out=$2; target=${3:--14}
stats=$(ffmpeg -nostdin -hide_banner -i "$in" -af loudnorm=I=$target:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$stats" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
ffmpeg -nostdin -loglevel error -y -i "$in" -af "loudnorm=I=$target:TP=-1.5:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true" -ar 48000 "$out"
ffmpeg -nostdin -hide_banner -i "$out" -af ebur128=peak=true -f null - 2>&1 | grep -A12 Summary | grep -E "I:|Peak:" | tr -s ' '
