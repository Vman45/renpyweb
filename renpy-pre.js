/*
Emscripten hooks - downloads external Ren'Py game on demand

Copyright (C) 2019  Sylvain Beucler

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation files
(the "Software"), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of the Software,
and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

Module['onRuntimeInitialized'] = function() {
    _GET = {};
    if (location.search.length > 0) {
      location.search.substr(1).split('&').forEach(function(item) {
        _GET[item.split("=")[0]] = item.split("=")[1]
      });
    }
    //var query_string = '?';
    //for (i in _GET) { query_string += i+'='+_GET[i]+'&'; }
    //query_string = query_string.slice(0, -1);


    var show_error = false;
    var url = 'game.zip';
    
    if (_GET['game']) {
        show_error = true;
	url = _GET['game'];
    }

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onprogress = function(event) {
        var size = -1;
        if (event.total) size = event.total;
        if (event.loaded) {
            if (!xhr.addedTotal) {
                xhr.addedTotal = true;
                if (!Module.dataFileDownloads) Module.dataFileDownloads = {};
                Module.dataFileDownloads[url] = {
                    loaded: event.loaded,
                    total: size
                };
            } else {
                Module.dataFileDownloads[url].loaded = event.loaded;
            }
            var total = 0;
            var loaded = 0;
            var num = 0;
            for (var download in Module.dataFileDownloads) {
                var data = Module.dataFileDownloads[download];
                total += data.total;
                loaded += data.loaded;
                num++;
            }
            total = Math.ceil(total * Module.expectedDataFileDownloads/num);
            if (Module['setStatus']) Module['setStatus']('Downloading Story... (' + loaded + '/' + total + ')');
        } else if (!Module.dataFileDownloads) {
            if (Module['setStatus']) Module['setStatus']('Downloading Story...');
        }
    };
    xhr.onerror = function(event) {
        console.log(xhr);
        console.log(event);
	if (show_error) {
	    Module.print("Cannot download game. Maybe the download was blocked, see the JavaScript console for more information.");
	} else {  /* no game querystring */
	    enableGUI();
	}
    }
    xhr.onload = function(event) {
        if (xhr.status == 200 || xhr.status == 304 || xhr.status == 206 || (xhr.status == 0 && xhr.response)) {
            FS.writeFile('game.zip', new Uint8Array(xhr.response));
            if (Module['setStatus']) Module['setStatus']('');
	    Module.print("Extracting Story...\n");
            window.setTimeout(function() { gameExtract(); }, 200);
        } else {
            console.log(xhr);
            console.log(event);
	    if (show_error) {
		Module.print("Error while downloading " + xhr.responseURL
                             + " : " + xhr.statusText + " (status code " + xhr.status + ")");
	    } else {  /* no game querystring */
		enableGUI();
	    }
        }
    };
    xhr.send(null);
}

// Don't throw exception on sys.exit()
Module['quit'] = function() {
    console.log('Module.quit');
    Module['setStatus']('Quit');
}
