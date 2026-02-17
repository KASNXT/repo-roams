#!/bin/bash
# Monitor VPN connections - Run on VPS
# Usage: ./check_vpn_stations.sh

echo "════════════════════════════════════════════════════"
echo "     ROAMS VPN STATIONS - CONNECTION STATUS"
echo "════════════════════════════════════════════════════"
echo ""

# Check active PPP interfaces
echo "📡 Active VPN Connections:"
echo "────────────────────────────────────────────────────"
ip -brief addr show | grep ppp | while read -r line; do
    interface=$(echo "$line" | awk '{print $1}')
    ip=$(echo "$line" | grep -oP '\d+\.\d+\.\d+\.\d+' | tail -1)
    
    # Map IPs to stations
    case "$ip" in
        "10.99.0.2") station="BOMBO" ;;
        "10.99.0.3") station="NAKASONGOLA" ;;
        "10.99.0.4") station="KAKUNGULA" ;;
        "10.99.0.5") station="KAMPALA" ;;
        "10.99.0.6") station="ABUSHA" ;;
        *) station="UNKNOWN" ;;
    esac
    
    echo "✅ $interface → $ip ($station)"
done

echo ""
echo "────────────────────────────────────────────────────"
echo "📊 Connection Summary:"
echo "────────────────────────────────────────────────────"

# Count total connections
total=$(ip addr | grep -c "inet.*peer.*ppp")
echo "Total Connected: $total station(s)"

echo ""
echo "────────────────────────────────────────────────────"
echo "🔍 Station Status:"
echo "────────────────────────────────────────────────────"

# Check each station
check_station() {
    local name=$1
    local ip=$2
    
    if ip addr | grep -q "peer $ip"; then
        # Test ping
        if timeout 2 ping -c 1 -W 1 "$ip" &>/dev/null; then
            echo "✅ $name ($ip) - Connected & Responding"
        else
            echo "⚠️  $name ($ip) - Connected but not responding to ping"
        fi
    else
        echo "❌ $name ($ip) - Disconnected"
    fi
}

check_station "Bombo      " "10.99.0.2"
check_station "Nakasongola" "10.99.0.3"
check_station "Kakungula  " "10.99.0.4"
check_station "Kampala    " "10.99.0.5"
check_station "Abusha     " "10.99.0.6"

echo ""
echo "────────────────────────────────────────────────────"
echo "📝 Recent L2TP Events (Last 10):"
echo "────────────────────────────────────────────────────"
journalctl -u xl2tpd --no-pager -n 10 | grep -E "Connection|tunnel|call" | tail -10

echo ""
echo "════════════════════════════════════════════════════"
echo "Timestamp: $(date)"
echo "════════════════════════════════════════════════════"
