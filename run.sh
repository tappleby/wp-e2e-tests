#!/bin/bash
MOCHA=./mocha/bin/mocha
REPORTER=""
PARALLEL=0
JOBS=0
AFTER="lib/after.js"
OPTS=""
SCREENSIZES="mobile,desktop,tablet"
RETURN=0

# Function to join arrays into a string
function joinStr { local IFS="$1"; shift; echo "$*"; }

I18N_CONFIG='"browser":"firefox","proxy":"system","neverSaveScreenshots":"true"'
VISDIFF_CONFIG='"neverSaveScreenshots":"true"'
declare -a TARGETS
declare -a NODE_CONFIG_ARGS

usage () {
  cat <<EOF
-R		  - Use custom Slack/Spec/XUnit reporter, otherwise just use Spec reporter
-p [jobs]	  - Execute [num] jobs in parallel
-s		  - Screensizes in a comma-separated list (defaults to mobile,desktop,tablet); Prepend a browser name to use something other than the default Chrome (i.e. firefox:desktop)
-g		  - Execute general tests in the specs/ directory
-i		  - Execute i18n tests in the specs-i18n/ directory (Uses Firefox)
-v [all/critical] - Execute the visdiff tests in specs-visdiff[/critical].  Must specify either 'all' or 'critical'.
-l		  - Execute tests on Sauce Labs
-h		  - This help listing
EOF
  exit 0
}

if [ $# -eq 0 ]; then
  usage
fi

while getopts ":Rp:s:giv:hl" opt; do
  case $opt in
    R)
      REPORTER="-R spec-xunit-slack-reporter"
      continue
      ;;
    p)
      PARALLEL=1
      JOBS=$OPTARG
      continue
      ;;
    s)
      SCREENSIZES=$OPTARG
      continue
      ;;
    g)
      TARGET="specs/"
      ;;
    i)
      NODE_CONFIG_ARGS+=($I18N_CONFIG)
      TARGET="specs-i18n/"
      ;;
    v)
      NODE_CONFIG_ARGS+=($VISDIFF_CONFIG)
      if [ "$OPTARG" == "all" ]; then
        TARGET="specs-visdiff/\*"
      elif [ "$OPTARG" == "critical" ]; then
        TARGET="specs-visdiff/critical/"
      else
        echo "-v supports the following values: all or critical"
        exit 1
      fi
      ;;
    l)
      NODE_CONFIG_ARGS+=('"sauce":"true"')
      continue
      ;;
    h)
      usage
      ;;
    \?)
      echo "Invalid option: -$OPTARG" >&2
      echo ""
      usage
      ;;
    :)
      echo "Option -$OPTARG requires an argument" >&2
      echo ""
      usage
      ;;
  esac

  TARGETS+=("$TARGET")
done

# Ensure no parallel_exec command list file exists
rm -f parallel_exec.cmd

IFS=, read -r -a SCREENSIZE_ARRAY <<< "$SCREENSIZES"
for size in ${SCREENSIZE_ARRAY[@]}; do
  for target in "${TARGETS[@]}"; do
    # Combine any NODE_CONFIG entries into a single object
    NODE_CONFIG_ARG="$(joinStr , ${NODE_CONFIG_ARGS[*]})"

    NC="--NODE_CONFIG='{$NODE_CONFIG_ARG}'"

    CMD="echo env BROWSERSIZE=$size $MOCHA $NC $REPORTER $target $AFTER"

    if [ $PARALLEL == 1 ]; then
      echo $CMD >> parallel_exec.cmd
    else
      eval $CMD
      RETURN+=$?
    fi
  done
done

if [ $PARALLEL == 1 ]; then
#  cat parallel_exec.cmd | parallel --jobs $JOBS --pipe bash
  parallel -a parallel_exec.cmd -j3 --no-notice -u
  RETURN+=$?
  rm -f parallel_exec.cmd
fi

exit $RETURN
