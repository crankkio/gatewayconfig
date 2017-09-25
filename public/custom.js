function ajaxPOST(a, c, d) {
    var g = new XMLHttpRequest,
        h = "";
    for (var j in c) h += "&" + j + "=" + c[j];
    var k = h.substring(1);
    g.open("POST", a, !0), g.setRequestHeader("Content-type", "application/x-www-form-urlencoded"), g.onreadystatechange = function() {
        4 == g.readyState && 200 == g.status && d(g.responeText)
    }, g.send(k)
}

function ajaxGET(a, c, d, e) {
    var f = new XMLHttpRequest;
    f.onreadystatechange = function() {
        f.readyState == XMLHttpRequest.DONE && (200 == f.status ? c(f.responseText) : 400 == f.status ? d() : e())
    }, f.open("GET", a, !0), f.send()
}

function updateHooks(a, c) {
    for (var d = document.getElementsByClassName(a), e = 0; e < d.length; e++) c(d.item(e))
}

function hookPassSave(a) {
    a.addEventListener("click", function() {
        var c = a.dataset.ssid,
            d = document.getElementById(c + "_inputfield"),
            e = {};
        e.s = c, e.p = d.value, ajaxPOST("./wifisave", e, () => {
            var g = document.getElementById(c + "_passfield");
            g.classList.contains("on") ? g.classList.remove("on") : g.classList.add("on"), showNotification("Password successfully saved."), updateList()
        }, () => {}, () => {})
    })
}

function hookRemoveEvent(a) {
    a.addEventListener("click", function() {
        var c = a.dataset.ssid,
            d = {};
        d.s = c, d.p = "", ajaxPOST("./wifiremove", d, () => {
            showNotification("SSID successfully removed."), updateList()
        }, () => {}, () => {})
    })
}

function hookEvent(a) {
    a.addEventListener("click", function() {
        var c = a.dataset.ssid,
            d = document.getElementById(c + "_passfield");
        d.classList.contains("on") ? d.classList.remove("on") : d.classList.add("on")
    })
}
String.prototype.replaceAll = function(a, c) {
    var d = this;
    return d.replace(new RegExp(a, "g"), c)
};
var template = `<tr><td>{ssid}</td><td><span class="q {l}">{s}%</span></td><td id="{ssid}_passfield" class="passwordfield"><div class="buttonfield"><a class="button editorswitch" data-ssid="{ssid}" href="#">Update</a>      </div><div class="editorfield"><input type="password" id="{ssid}_inputfield" placeholder="*****"><a class="button button-primary savebutton" data-ssid="{ssid}" href="#">Save</a><a class="button cancelbutton" data-ssid="{ssid}" href="#">Cancel</a>      </div>            </td>      </tr>`,
    savedItemTemplate = `<tr><td>{ssid}</td><td><span class="q {l}">{s}%</span></td><td id="{ssid}_passfield" class="passwordfield"><div class="buttonfield"><a class="button removebutton" data-ssid="{ssid}" href="#">Remove</a></div></td></tr>`;

function createSSIDList(a, c) {
    var d = JSON.parse(a),
        e = "",
        f;
    for (var g in d) f = c, f = f.replaceAll("{ssid}", d[g].SSID), f = f.replaceAll("{s}", d[g].signal), f = "true" == d[g].protected ? f.replaceAll("{l}", "l") : f.replaceAll("{l}", ""), e += f;
    return e
}

function appendSavedAPsToTable(a) {
    var c = JSON.parse(a),
        d = c.ssid,
        e = [];
    for (var f in d) {
        var g = {};
        g.SSID = d[f], g.signal = " - ", g.protected = "true", "" != g.SSID && e.push(g)
    }
    var h = createSSIDList(JSON.stringify(e), savedItemTemplate),
        j = document.getElementById("tableSavedContent");
    j.innerHTML = h, updateHooks("removebutton", hookRemoveEvent)
}

function appendToTable(a) {
    var c = createSSIDList(a, template),
        d = document.getElementById("tableContent");
    d.innerHTML = c, updateHooks("editorswitch", hookEvent), updateHooks("cancelbutton", hookEvent), updateHooks("savebutton", hookPassSave)
}

function wireMenu() {
    for (var a = document.getElementsByClassName("menu"), c = 0; c < a.length; c++) a.item(c).addEventListener("click", function() {
        for (var d = this, e = document.getElementsByClassName("content"), f = 0; f < e.length; f++) e.item(f).style.display = "none";
        var g = document.getElementById(d.dataset.page + "Page");
        g.style.display = "block"
    })
}
wireMenu();

function showNotification(a) {
    var c = document.getElementById("notification");
    c.innerHTML = a, c.classList.remove("hide"), c.classList.add("show"), setTimeout(() => {
        var d = document.getElementById("notification");
        d.classList.remove("show"), d.classList.add("hide")
    }, 4e3)
}

function wireCustomUpdate() {
    var a = document.getElementById("customUpdate");
    a.addEventListener("click", function() {
        var c = document.getElementById("customSSIDField"),
            d = document.getElementById("customPassField"),
            e = {};
        e.s = c.value, e.p = d.value, ajaxPOST("./wifisave", e, () => {
            showNotification("Password successfully saved."), updateList()
        }, () => {}, () => {})
    })
}
wireCustomUpdate();

function updateList() {
    ajaxGET("./APList", appendToTable, () => {}, () => {}), ajaxGET("./savedAPList", appendSavedAPsToTable, () => {}, () => {})
}

function refreshList() {
    console.log("xxxx");
    var a = document.getElementById("configPage"),
        c = "block" == a.style.display;
    document.getElementById("refreshCheckBox").checked && c && updateList()
}
ajaxGET("./APList", appendToTable, () => {}, () => {}), ajaxGET("./savedAPList", appendSavedAPsToTable, () => {}, () => {}); setInterval(refreshList, 5000);
