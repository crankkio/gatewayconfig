var renderMW = require('./render');
var fs = require('fs');
var wifi = require('node-wifi');

var configPath = '/etc/wpa_supplicant/wpa_supplicant.conf';
module.exports = function(app){

  var objectRepository = {
    };

    
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
        renderMW(objectRepository, 't')
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
        res.send({"ssid":netconfig});
    }
}

);

app.get("/APList",
    function(req, res, next) {

    wifi.init({
        iface : 'null' // network interface, choose a random wifi interface if set to null 
    });

    wifi.scan(function(err, networks) {
        if (err) {
            res.send("{}");
        } else {
            for(var z in networks){
                networks[z].SSID = networks[z].ssid;
                quality = 0;
                RSSI = networks[z].signal_level;
                if (RSSI <= -100) {
                    quality = 0;
                } else if (RSSI >= -50) {
                    quality = 100;
                } else {
                    quality = 2 * (RSSI + 100);
                }
                
                networks[z].signal = quality;
            }
            res.send(networks);
        }
    });

    });
}