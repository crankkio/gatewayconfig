## Gateway dokumentáció

A kiindulási alap a következő post 
https://github.com/ttn-zh/ic880a-gateway/wiki

Mivel tehetjük jobbá, stabilabbá, felhasználóbaráttá szoftveresen (és hardveresen) ezt a megoldást

* Wifi konfigurálhatóság rPi linux hozzáférés nélkül
	* Az eszköz Wifi AP-ként indul, captive portal módon átirányít saját maga által kiszolgált weblapra, mely konfigurációs változtatásokat tesz lehetővé, elsősorban a csatlakozni kívánt Wifi jelszavának megadását, hogy a jelszó ne hagyja el a készüléket biztonsági megfontolás miatt
		* A megoldás alapját egy NodeJS webszerver képzi, ez fogja biztosítani a felületet a konfigurációhoz. 
			* A project egy egyszerű express app, ami végeredményben egy konfigurációs fájlt editál. 
			* A WIFI szkenneléshez a iwlist csomagot (vigyázat, ami a fejlesztői környezetben megy, nem biztos hogy az rpi-n is fog) használtam fel (elérhető AP pontokat újra kellett parsolni és megjeleníteni az oldalon).  
			* A kapott adatokkal legenerálja a fájl tartalmát.
			* Az generált fájl a /etc/wpa_supplicant/wpa_supplicant.conf.
			* A megoldás hiányossága, hogy nem jelennek meg a jelerősségek.
			* Nem biztos hogy root-ként szerencsés ezt elindítani, esetleg érdemes egy új group-ot felvenni a fájl szerkesztéséhez.
			* Az oldalon periodukusan frissíthető az elérhető WIFI-lista
			* TTY.JS csomaggal terminált varázsolhatunk a böngészőnkbe, ezt le is lehet jelszavazni (sajnos csak SHA-1-hash-el)
			* A megjelenítéshez Skeleton CSS lett használva, így reszponzív az oldal.
		* A NodeJS-t a Raspberry PI 2 és 3 támogatja, így installálható:
			* `curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -`
			* `sudo apt install nodejs`
		* Ezen a ponton kész a szerverünk, node index.js-el el is indíthatjuk, de hogy fogjuk ezt elérni?
		* A Hostapd csomag telepítésével és konfigurálásával lehetséges AP Hotspotot csinálni az eszközünkből.
			* https://nims11.wordpress.com/2012/04/27/hostapd-the-linux-way-to-create-virtual-wifi-access-point/ (A DHCP bekezdés és az utána lévőek már nem kellenek)
			* /etc/hostapd/hostapd.conf
			```
			interface=wlan0
driver=nl80211
hw_mode=g
channel=6
wmm_enabled=1
ht_capab=[HT40][SHORT-GI-20][DSSS_CCK-40]
macaddr_acl=0
ignore_broadcast_ssid=0
auth_algs=1
wpa=2
wpa_key_mgmt=WPA-PSK
rsn_pairwise=CCMP
ssid=GWCONF
wpa_passphrase=AlertJack
ieee80211n=1
	```
	* Érdemes még telepíteni a dnsmasq csomagot is:
		* 	https://nims11.wordpress.com/2013/05/22/using-hostapd-with-dnsmasq-to-create-virtual-wifi-access-point-in-linux/
	* Érdemes még telepíteni a dnsmasq csomagot is:
		* https://nims11.wordpress.com/2013/05/22/using-hostapd-with-dnsmasq-to-create-virtual-wifi-access-point-in-linux/
	* Network availability script
		* Egyszerű script, mely ping alapján ellenőrzi, hogy az internet elérhető-e és vagy a linux networkinget indítja újra vagy teljesen rebootol
		* maga a script
```
#!/bin/bash

rebootOnNormalUsage() {

SERVICE=hostapd;

if ps ax | grep -v grep | grep $SERVICE > /dev/null
then
# service is running, so we are configuring the device now, no check
logger -s "No reboot now, no network during configuration"
else
logger -s "$SERVICE is not running and network is unreachable, restart"
reboot now
fi

}

(! ping -c1 8.8.8.8 >/dev/null 2>&1) && rebootOnNormalUsage >/dev/null 2>&1
```
* A 8.8.8.8-as DNS szerverre történő sikertelen ping esetén az és ág másik része kerül kiértékelésre, ami egy újraindítás (amennyiben nem konfiguráljuk éppen)

* Hardware watchdog
	* Az rPi tartalmaz hardware watchdogot, amit a Jessie képes használni, ennek aktiválása azonban néhány lépést igényel
	* Ez alapján indultunk el:
		* http://blog.ricardoarturocabral.com/2013/01/auto-reboot-hung-raspberry-pi-using-on.html
		* Ám hamar kiderült, hogy más modul kell az RPI 3-hoz (bcm2835_wdt): https://raspberrypi.stackexchange.com/questions/37835/raspbian-watchdog-fails-at-boot
		* Illetve a sikeres telepítés sem garantálja a működést, így a service beállításainál picit módosítani kellett: https://raspberrypi.stackexchange.com/questions/33850/pi-b-raspbian-jessie-watchdog-doesnt-start-at-boot
* Graceful Shutdown
	* Az eszközön nem található gomb, ám szeretnénk ha az eszközt le tudnánk manuálisan is állítani.
	* A köztes nyákon elérhető a GPI13, ezt magas szintre,  3v3-ra kötve nem fog leállni az eszköz.
	* http://raspberrypi-aa.github.io/session2/bash.html
vagy ez alapján: https://github.com/lasandell/RaspberryPi/blob/master/gpio
```
#!/bin/bash

# Utility to control the GPIO pins of the Raspberry Pi
# Can be called as a script or sourced so that the gpio
# function can be called directly

function gpio()
{
    local verb=$1
    local pin=$2
    local value=$3

    local pins=($GPIO_PINS)
    if [[ "$pin" -lt ${#pins[@]} ]]; then
        local pin=${pins[$pin]}
    fi

    local gpio_path=/sys/class/gpio
    local pin_path=$gpio_path/gpio$pin

    case $verb in
        read)
            cat $pin_path/value
        ;;

        write)
            echo $value > $pin_path/value
        ;;

        mode)
            if [ ! -e $pin_path ]; then
                echo $pin > $gpio_path/export
            fi
            echo $value > $pin_path/direction
        ;;

        state)
            if [ -e $pin_path ]; then
                local dir=$(cat $pin_path/direction)
                local val=$(cat $pin_path/value)
                echo "$dir $val"
            fi
        ;;

        *)
#            echo "Control the GPIO pins of the Raspberry Pi"
#            echo "Usage: $0 mode [pin] [in|out]"
#            echo "       $0 read [pin]"
#            echo "       $0 write [pin] [0|1]"
#            echo "       $0 state [pin]"
#            echo "If GPIO_PINS is an environment variable containing"
#            echo "a space-delimited list of integers, then up to 17"
#            echo "logical pins (0-16) will map to the physical pins"
#            echo "specified in the list."
        ;;
    esac
}

# Just invoke our function if the script is called directly
if [ "$BASH_SOURCE" == "$0" ]; then
    gpio $@
fi

gpio mode 13 in
state=$(gpio read 13)
if [ "$state" -lt 1 ]; then
	sleep 60
	state=$(gpio read 13)
	if [ "$state" -lt 1 ]; then
  shutdown now
	fi
fi

exit 0
```
* Fix GPS koordináta helyett dinamikusan megállapított
	* Előfordulhat, hogy egy Gw-t áthelyezünk és ekkor a korábban fixen beállított GPS koordináták már nem érvényesen. Ezeket mindig át kellene állítani ilyenkor a configban.
	* Ehelyett a statikus megoldás helyett induláskor wifi scanneléssel wifi alapú helymeghatározást végzünk és ezt letároljuk
	* A scannelést a nodejs szerver végzi, az eredményt egy fájlba írja:
	
```javascript
	iw.scan(function(err, networks) {
if (err) {
console.log(err)
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
```

* Később egy script ezt a fájlt feldolgozza, egy curl-el elküldi ezeket a google geolocation API-jának.
* Genlocalconf.sh teljes script: várunk, amíg nem pingelhető a 8.8.8.8, azután curl-el az elmentett json-t elküldjük. Választ a jq-val parsoljuk fel. Default értékként 0-t adtunk meg (pl service elérhetetlen).Ez után legeneráljuk a gateway ID-jét, majd a kapott változókat behelyettesíŧjük egy template-be. A végén random password generálás található.

```
#!/bin/bash

var=30
until ping -c1 8.8.8.8 &>/dev/null
do :
sleep 1
if [ "$var" -lt 0 ]; then
break
fi
var=$((var-1))
done

header="Content-Type: application/json"
FILENAME="/opt/gwconf/geolocation.json"
request_body=$(cat $FILENAME)
echo $request_body
answer=$(curl -X POST -H "$header" -d "$request_body" https://www.googleapis.com/geolocation/v1/geolocate?key=AIzaSyAytlt33H-gH81eNTGPQfPcQI65ADH5aV4)
lat=$(echo $answer | jq '.location.lat')
lng=$(echo $answer | jq '.location.lng')

re='^[0-9]+([.][0-9]+)?$'
if ! [[ $lat =~ $re ]]  || ! [[ $lng =~ $re ]] ; then
lat=0
lng=0
fi

Stop on the first sign of trouble
set -e

if [ $UID != 0 ]; then
echo "ERROR: Operation not permitted. Forgot sudo?"
exit 1
fi

VERSION="spi"
if [[ $1 != "" ]]; then VERSION=$1; fi
GATEWAY_EUI_NIC="eth0"
if [[ grep "$GATEWAY_EUI_NIC" /proc/net/dev == "" ]]; then
GATEWAY_EUI_NIC="wlan0"
fi

if [[ grep "$GATEWAY_EUI_NIC" /proc/net/dev == "" ]]; then
echo "ERROR: No network interface found. Cannot set gateway ID."
exit 1
fi

GATEWAY_EUI=$(ip link show $GATEWAY_EUI_NIC | awk '/ether/ {print $2}' | awk -F\: '{print $1$2$3"FFFE"$4$5$6}')
GATEWAY_EUI=${GATEWAY_EUI^^} # toupper

echo $GATEWAY_EUI

template=cat /opt/gwconf/local_conf.json.template
template=${template//#GWID#/$GATEWAY_EUI}
template=${template//#LAT#/$lat}
template=${template//#LNG#/$lng}
echo -e $template > /opt/ttn-gateway/bin/local_conf.json

echo "config generated"

p=$(pwgen 15 1)

echo "ttn:$p" | chpasswd
exit 0
```
* Távoli hozzáférés opciók router mögött
	* Reverse SSH Tunnel
		* Hogy férjünk hozzá az eszközhöz? Építsünk ki egy SSH tunnelt egy szerverig. A tunnel a szerver adott portjára "akaszkodik rá". Amennyiben a saját gépünkről belépünk a szerverre, majd ssh-zunk a szerver localhost-jának adott portjára, az a raspberry-re továbbít.
		* Adott portokat érdemes előtte kinyitni
		* AgetForwardhoz szükséges editálni az ssh configját.
		* Ez a snippet a tunnelt építi ki egy véletlenszerű portra 10000 és 19999 között. Amennyiben nem sikerül, vagy portok ütköznek, még 3-szor próbálkozik újra.
		* AutoSSH csomag, hogy timeout esetén újracsatlakozzon
		* Az autoSSH biztosít egy monitor portot, amin figyeli a szerver oldalán, hogy a tunnel él-e még. Mivel minden újraindulásnál random portra csatlakozunk, ezért ezt deaktiváltam. Így az autoSSH csak tunnel timeoutoknál fog újracsatlakozni (ez 1 percre van állítva), ha újraindul az eszköz, az több mint 1 perc, ekkor bomlik a kapcsolat.
```
i="0"
while [ $i -lt 4 ]
do
i=$[$i+1]
port=$(( ( RANDOM % 10000 )  + 10000 ))
autossh -M 0 -fnNT -R $port:localhost:22 -o ExitOnForwardFailure=yes root@79.172.210.31 && \
echo "ssh tunnel started successfully at port $port" && break || \
echo "ssh tunnel failed to start"
done
```
*	A megfelelő kulcsokat le kellett generálni, publikusat a szerveren elhelyezni előtte.
*	Teljes tunnel.sh szkript:
```
#!/bin/bash
set -e

if [ $UID != 0 ]; then
echo "ERROR: Operation not permitted. Forgot sudo?"
exit 1
fi

VERSION="spi"
if [[ $1 != "" ]]; then VERSION=$1; fi
GATEWAY_EUI_NIC="eth0"
if [[ grep "$GATEWAY_EUI_NIC" /proc/net/dev == "" ]]; then
GATEWAY_EUI_NIC="wlan0"
fi

if [[ grep "$GATEWAY_EUI_NIC" /proc/net/dev == "" ]]; then
echo "ERROR: No network interface found. Cannot set gateway ID."
exit 1
fi

GATEWAY_EUI=$(ip link show $GATEWAY_EUI_NIC | awk '/ether/ {print $2}' | awk -F\: '{print $1$2$3"FFFE"$4$5$6}')
GATEWAY_EUI=${GATEWAY_EUI^^} # toupper


i="0"
while [ $i -lt 4 ]
do
i=$[$i+1]
port=$(( ( RANDOM % 10000 )  + 10000 ))
autossh -M 0 -fnNT -R $port:localhost:22 -o ExitOnForwardFailure=yes root@79.172.210.31 && \
echo "ssh tunnel started successfully at port $port" && break || \
echo "ssh tunnel failed to start"
done

echo "tunnel created"
LOWER_GATEWAY_EUI=${GATEWAY_EUI,,} # tolower

postURL="http://api.alertjack.com/v1.1/lora/gateway/$LOWER_GATEWAY_EUI?access_token=PGnz3AsW6buwbzCFV8DR2gPmibp8hW"

echo $postURL

curl -i \
-X POST --data "{port:$port }" $postURL

exit 0
```
* Az eddig leírtak ugyan működnek egyenként, de hogyan lesz ebből egy konfigurálható, távolról managelhető GW? Az említett scripteket systemd-vel ütemezzük. A sorrend:
* **BeforeNetwork**: Amint elérhetőek a /opt/ fájljai, de még nincs network, legyen az aktuális interfaces fájl az ami a hotspothoz kell.
	* Az új hotspot interfaces fájl (/etc/network/interfaces.hostapd ) legyen:
```
source-directory /etc/network/interfaces.d

auto lo
iface lo inet loopback

iface eth0 inet manual

allow-hotplug wlan0
iface wlan0 inet static
address 192.168.4.1
netmask 255.255.255.0
network 192.168.4.0
broadcast 192.168.4.255

allow-hotplug wlan1
iface wlan1 inet manual
```
* Ennek másolását a /opt/gwconfig/beforenetwork.sh fájl végzi el:
```
#!/bin/sh -e
#

cp /etc/network/interfaces.hostapd /etc/network/interfaces
exit 0
```
* A script ütemezéséért egy új systemd service (/lib/systemd/system/beforenetwork.service) felel:
```
[Unit]
Description=CP hotspot interfaces file
Before=network.target
Wants=network.target
DefaultDependencies=no
Requires=local-fs.target
After=local-fs.target

[Service]
WorkingDirectory=/opt/gwconf/
ExecStart=/opt/gwconf/beforenetwork.sh
SyslogIdentifier=beforenetwork
Type=oneshot
RemainAfterExit=yes


[Install]
WantedBy=multi-user.target
```
* Hotspotconf:
	* Megfelelő servicek elindítása
	* A /opt/gwconf/hotspotconf.sh:
```
#!/bin/sh -e
#

service hostapd start
service dnsmasq start

exit 0
```
* A /lib/systemd/systemd/hotspotconf.service:
```
[Unit]
Description=Hotspot settings for Gateway
After=network.target
Before=gwconfig.service

[Service]
WorkingDirectory=/opt/gwconf/
ExecStart=/opt/gwconf/hotspotconf.sh
SyslogIdentifier=hotspotconf

[Install]
```	

*	GWConfig: NodeJS szerver indítása
	* A bash script (/opt/gwconf/gwconfig.sh)
```
#!/bin/sh -e
#

cd /home/ttn/gatewayconfig
node index.js > node.log

exit 0
```
* A  hozzá tartozó /lib/systemd/gwconfig.service

```
[Unit]
Description=Start nodejs server for Gateway
Before=restorenetwork.service

[Service]
Type=oneshot
WorkingDirectory=/opt/gwconf/
ExecStart=/opt/gwconf/gwconfig.sh
SyslogIdentifier=gwconfig

[Install]
WantedBy=multi-user.target
```
* RestoreNetwork: A hotspothoz tartozó servicek leállítása, interfaces fájl lecserélése
	* The /etc/network/interfaces.normal file:
```
source-directory /etc/network/interfaces.d

auto lo
iface lo inet loopback

auto eth0
iface eth0 inet manual

allow-hotplug wlan0
auto wlan0
iface wlan0 inet dhcp
wpa-conf /etc/wpa_supplicant/wpa_supplicant.conf


allow-hotplug wlan1
iface wlan1 inet manual
```
* A /opt/gwconf/restorenetwork.sh script:

```
#!/bin/sh -e
#

cp /etc/network/interfaces.normal /etc/network/interfaces
service hostapd stop
service dnsmasq stop
sleep 10
ifdown wlan0
sleep 10
ifup wlan0

exit 0
```
* A /lib/systemd/system/restorenetwork.service

```
[Unit]
Description=Restore network for Gateway
Before=genlocalgwconfig.service

[Service]
Type=oneshot
RemainAfterExit=true
WorkingDirectory=/opt/gwconf/
ExecStart=/opt/gwconf/restorenetwork.sh
SyslogIdentifier=restorenetwork

[Install]
WantedBy=multi-user.target
```
* Konfigurációs fájl generálása a Lora Gateway számára:
	* A /opt/gwconf/genlocalconf.sh tartalma feljebb található
	* A /opt/gwconf/genlocalconf.json a nodejs szerver által generálódik le
	* A /opt/gwconf/local_conf.json.template
```
{
"gateway_conf": {
"gateway_ID": "#GWID#",
"servers": [ { "server_address": "router.eu.thethings.network", "serv_port_up": 1700, "serv_port_down": 1700, "serv_enabled": true } ],
"ref_latitude": #LAT#,
"ref_longitude": #LNG#,
"ref_altitude": 0,
"contact_email": "",
"description": "Obj-#GWID#"
}
}
```
A genlocalconfig.service fájl
```
[Unit]
Description=Generate local conf for Gateway
Before=tunnel.service

[Service]
Type=oneshot
RemainAfterExit=true
WorkingDirectory=/opt/gwconf/
ExecStart=/opt/gwconf/genlocalgwconfig.sh
SyslogIdentifier=genlocalgwconfig

[Install]
WantedBy=multi-user.target
```
* Tunnel létrehozása:
	* A /opt/gwconf/tunnel.sh script fentebb található.
	* A service (/lib/systedm/system/tunnel.service)
		* A típusnál a forking a háttérben futás miatt szükséges

```
[Unit]
Description=Generate tunnel
Before=ttn-gateway.service

[Service]
Type=forking
RemainAfterExit=true
WorkingDirectory=/opt/gwconf/
ExecStart=/opt/gwconf/tunnel.sh
SyslogIdentifier=tunnel

[Install]
WantedBy=multi-user.target
```
* Az utolsó service a TTN-Gateway, ezen nem szükséges változtatni.
* **Az új servicek a systemctl enable `<servicenév>` paranccsal aktiválhatóak.**
* Háromféleképpen indulhat újra/állhat le az eszköz normál használhat mellett:
	* HW Watchdog, ehhez fentebb található leírás
	* Network Availibility script (ez legyen most a /opt/resetgw/resetgw.sh)
	* Graceful Shutdown (/opt/resetgw/gracefulshutdown.sh)
		* Utóbbi kettő cron-nal van ütemezve, előbbi percenként, utóbbi 10 percenként fut le (/etc/crontab utolsó két sora):
```
*/10 * * * * root /opt/resetgw/resetgw.sh
* * * * * root /opt/resetgw/gracefulshutdown.sh
```
A crontab fájl után le felejtsük el újratölteni
