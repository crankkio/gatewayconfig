var renderMW = require('./render');
var fs = require('fs');
var wifi = require('node-wifi');
var iw = require("iwlist")("wlan0")

var started = (new Date()).getTime();
var updated = (new Date()).getTime();

setTimeout(checkStarted, 120000);

function checkStarted(){

if((started - updated) == 0 ){
	process.exit();
}

}


setInterval(checkAndShutdown, 600000);

function checkAndShutdown(){

var current = (new Date()).getTime();
if((current - updated) > 9999 ){
	process.exit();
}

}

var configPath = '/etc/wpa_supplicant/wpa_supplicant.conf';
module.exports = function(app){

  var objectRepository = {
    };


app.get("/shutdown", function(req, res, next) {
	process.exit();
	next();
});

    
app.post("/save", function(req, res, next) {
    var data = req.body["data"];
    var content = `ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=wheel
`;
    var nw = `
network={
    ssid="<ssid>"
    psk="<psk>"
}
`;
    for(var d in data){
        var temp = nw.replace("<ssid>",data[d].ssid);
        temp = temp.replace("<psk>", data[d].psk);
        content = content + temp;
    }

    fs.writeFile(configPath, content, 'utf8', function write(err){
        if (err) {
            throw err;
        }
        res.send("ok");
    });
});

app.post("/wifiremove", function(req, res, next) {
    removable = req.body["s"];

    fs.readFile(configPath, 'utf8', function read(err, data) {
        if (err) {
            throw err;
        }
        content = data;
    
        // Invoke the next step here however you like
        processFile();          // Or put the next step in a function and invoke it
    });

    function filterSSID(conf, rem){
        var result = [];
        for(var i in conf){

            if(conf[i].SSID != rem){
                result.push(conf[i]); // switch to filter
            }


        }
        return result;
    }
    
    function processFile() {
        var netconfig = [];

        var lines = content.split("\n");
        var foundNW = false;
        for( var l in lines){
            var c;
            if(lines[l].indexOf("network") != -1){
                foundNW = true;
                c = {};
            }
            if(foundNW){
                if(lines[l].indexOf("}") != -1){
                    foundNW = false;
                    netconfig.push(c);
                }
                if(lines[l].indexOf("ssid") != -1 && lines[l].indexOf("\"")!= -1){
                    var v = lines[l].split("\"");
                    c["SSID"] = v[1];
                }
                if(lines[l].indexOf("psk") != -1 && lines[l].indexOf("\"")!= -1){
                    var v = lines[l].split("\"");
                    c["psk"] = v[1];
                }
            }
        }
        
        // read is ok
        netconfig = filterSSID(netconfig, removable);
        saveList(netconfig);
        res.send("ok");
    }

});


app.post("/wifisave", function(req, res, next) {
    ssid = req.body["s"];
    pass = req.body["p"];

    fs.readFile(configPath, 'utf8', function read(err, data) {
        if (err) {
            throw err;
        }
        content = data;
    
        // Invoke the next step here however you like
        processFile();          // Or put the next step in a function and invoke it
    });

    function addSSID(conf, ssid, pass){
        conf.push({"SSID": ssid, "psk": pass});
        return conf;
    }
    
    function processFile() {
        var netconfig = [];

        var lines = content.split("\n");
        var foundNW = false;
        for( var l in lines){
            var c;
            if(lines[l].indexOf("network") != -1){
                foundNW = true;
                c = {};
            }
            if(foundNW){
                if(lines[l].indexOf("}") != -1){
                    foundNW = false;
                    netconfig.push(c);
                }
                if(lines[l].indexOf("ssid") != -1 && lines[l].indexOf("\"")!= -1){
                    var v = lines[l].split("\"");
                    c["SSID"] = v[1];
                }
                if(lines[l].indexOf("psk") != -1 && lines[l].indexOf("\"")!= -1){
                    var v = lines[l].split("\"");
                    c["psk"] = v[1];
                }
            }
        }
        
        // read is ok
        netconfig = addSSID(netconfig, ssid, pass);
        saveList(netconfig);
        res.send("ok");
    }

});

 function saveList(APlist) {
    var content = `
country=GB
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
`;
    var nw = `
network={
    ssid="<ssid>"
    psk="<psk>"
}
`;
    data = APlist;
    for(var d in data){
        var temp = nw.replace("<ssid>",data[d].SSID);
        temp = temp.replace("<psk>", data[d].psk);
        content = content + temp;
    }

    fs.writeFile(configPath, content, 'utf8', function write(err){
        if (err) {
            throw err;
        }
        return;
    });
}


app.get("/",
function(req, res, next) {

updated = (new Date()).getTime();
next();
},
renderMW(objectRepository,'config')
   );

app.get("/savedAPList",
function(req, res, next) {
    fs.readFile(configPath, 'utf8', function read(err, data) {
        if (err) {
            throw err;
        }
        content = data;
    
        // Invoke the next step here however you like
        processFile();          // Or put the next step in a function and invoke it
    });
    
    function processFile() {
        var netconfig = [];

        var lines = content.split("\n");
        var foundNW = false;
        for( var l in lines){
            var c;
            if(lines[l].indexOf("network") != -1){
                foundNW = true;
                c = {};
            }
            if(foundNW){
                if(lines[l].indexOf("}") != -1){
                    foundNW = false;
                    netconfig.push(c);
                }
                if(lines[l].indexOf("ssid") != -1 && lines[l].indexOf("\"")!= -1){
                    var v = lines[l].split("\"");
                    c["SSID"] = v[1];
                }
                if(lines[l].indexOf("psk") != -1 && lines[l].indexOf("\"")!= -1){
                    var v = lines[l].split("\"");
                    c["psk"] = v[1];
                }
            }
        }

		res.send({"ssid": netconfig});

    }
}

);


    iw.scan(function(err, networks) {
        if (err) {
            console.log(err)
            res.send("{}");
        } else {
        maclist = [];
	    for(var z in networks){
        	var t = {};
		t.macAddress= networks[z].address;
		maclist.push(t);            
	
	}

	fs.writeFile("/opt/gwconf/geolocation.json", JSON.stringify(maclist), 'utf8', function write(err){
        if (err) {
            throw err;
        }
        return;
    });
    
    }
    });



app.get("/APList",
    function(req, res, next) {


    iw.scan(function(err, networks) {
        if (err) {
            console.log(err)
            res.send("{}");
        } else {
            for(var z in networks){
                networks[z].SSID = networks[z].essid;
                quality = 0;
                RSSI = networks[z].signal_level;
                if (RSSI <= -100) {
                    quality = 0;
                } else if (RSSI >= -50) {
                    quality = 100;
                } else {
                    quality = 2 * (RSSI + 100);
                }
                console.log(networks)
                networks[z].signal = " - "; //quality;
            }
            res.send(networks);
        }
    });

    });
}
