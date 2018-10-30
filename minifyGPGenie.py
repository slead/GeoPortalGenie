# This script minifies the input scripts and appends the version number, and places the outputs into the /dist folder

version = "1.3.4"
gpGenieFile = "geoportalGenie"
initFile = "init"
browseFile = "browse"
previewFile = "preview"
detailsFile = "details"

import os
import os.path
from subprocess import call


for file in [gpGenieFile, initFile, browseFile, previewFile, detailsFile]:
  filename = file + "-" + version + ".js"
  print("Minifying " + filename)
  status = os.system('java -jar yuicompressor-2.4.8.jar ' + file + '.js -o dist/' + filename)
  if status != 0:
    print("There was a problem minifying " + file)


