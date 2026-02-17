# 📋 ABUSHA STATION - ROUTER CONFIGURATION CARD
**Print this page and give to technician**

---

## 🔧 ROUTER LOGIN
- **Router IP**: `http://192.168.1.1`
- **Default Admin Username**: *(ask site admin)*
- **Default Admin Password**: *(ask site admin)*

---

## 📡 VPN CONFIGURATION

### Step 1: Navigate to VPN Settings
Go to: **VPN → L2TP** or **Network → VPN → L2TP Client**

---

### Step 2: Fill in Basic Settings

```
┌─────────────────────────────────────────────────┐
│ Connection Name:    ROAMS-VPS-Abusha            │
│ Server Address:     144.91.79.167               │
│ Username:           abusha                      │
│ Password:           Abusha2026!                 │
└─────────────────────────────────────────────────┘
```

---

### Step 3: Configure IPsec Security

```
┌─────────────────────────────────────────────────┐
│ Enable IPsec:       ✅ YES (Check the box)      │
│ Auth Method:        Pre-Shared Key (PSK)       │
│                                                 │
│ PSK (copy exactly):                             │
│ pjwVSecL6gobvAaMzmpuT1tyUakJUWIXecGflbB9OEM=  │
│                                                 │
│ IKE Version:        IKEv1                       │
│ Encryption:         AES-128 or AES-256          │
│ Authentication:     SHA1 or SHA256              │
│ DH Group:           Group 2 or Group 14         │
└─────────────────────────────────────────────────┘
```

---

### Step 4: Advanced Settings (if available)

```
┌─────────────────────────────────────────────────┐
│ MTU:                1410                        │
│ Keep-alive:         ✅ Enabled                  │
│ NAT Traversal:      ✅ Enabled                  │
│ Default Route:      ❌ Disabled                 │
└─────────────────────────────────────────────────┘
```

---

### Step 5: Enable IP Forwarding

Go to: **Network → Firewall → General Settings**

```
┌─────────────────────────────────────────────────┐
│ IP Forwarding:      ✅ ENABLE                   │
└─────────────────────────────────────────────────┘
```

Click **Save** and **Apply**

---

### Step 6: Add Firewall Rules

Go to: **Network → Firewall → Custom Rules**

**Copy and paste these two lines:**

```bash
iptables -I FORWARD -s 10.99.0.0/24 -d 192.168.1.0/24 -j ACCEPT
iptables -I FORWARD -s 192.168.1.0/24 -d 10.99.0.0/24 -j ACCEPT
```

Click **Save** and **Apply**

---

### Step 7: Save and Connect

1. Click **Save Configuration**
2. Click **Apply Changes**
3. **Enable VPN Connection**
4. Wait 15-20 seconds

---

## ✅ SUCCESS VERIFICATION

### Check Router Status Page

You should see:

```
┌─────────────────────────────────────────────────┐
│ VPN Status:         Connected ✅                │
│ VPN IP Address:     10.99.0.6                   │
│ Server:             144.91.79.167               │
│ Uptime:             Connected since...          │
└─────────────────────────────────────────────────┘
```

### Check Router Logs

Look for these messages:

```
✅ L2TP connection established
✅ IPsec SA established  
✅ Assigned IP: 10.99.0.6
```

---

## 📞 TROUBLESHOOTING

### ❌ Connection Failed

**Check 1: Credentials**
- Username must be lowercase: `abusha` (not Abusha)
- Password is case-sensitive: `Abusha2026!`

**Check 2: PSK**
- Copy PSK exactly (no spaces before/after)
- PSK: `pjwVSecL6gobvAaMzmpuT1tyUakJUWIXecGflbB9OEM=`

**Check 3: Server Address**
- Must be: `144.91.79.167` (no http:// or spaces)

**Check 4: Internet Connection**
- Verify router has internet access first
- Try pinging `8.8.8.8` from router diagnostics

---

### ❌ Connected but Status Shows Wrong IP

**Expected IP**: `10.99.0.6`

If you see different IP:
- Check username is exactly: `abusha`
- Restart VPN connection
- Contact IT support

---

## 🔐 CREDENTIALS REFERENCE

**COPY THIS FOR YOUR RECORDS:**

```
═══════════════════════════════════════════════════
           ABUSHA STATION VPN CREDENTIALS
═══════════════════════════════════════════════════

VPS Server:         144.91.79.167
Username:           abusha
Password:           Abusha2026!
Expected VPN IP:    10.99.0.6

PSK (Pre-Shared Key):
pjwVSecL6gobvAaMzmpuT1tyUakJUWIXecGflbB9OEM=

IKE Version:        IKEv1
Encryption:         AES-128/256
Auth:               SHA1/SHA256

═══════════════════════════════════════════════════
```

---

## 📋 QUICK CHECKLIST

Before leaving site, verify:

- [ ] VPN Status shows: **Connected**
- [ ] VPN IP is: **10.99.0.6**
- [ ] Can ping VPS from router: `144.91.79.167`
- [ ] Router uptime shows connection is stable
- [ ] No error messages in system logs
- [ ] IP Forwarding is **Enabled**
- [ ] Firewall rules are **Applied**

---

## 📱 SUPPORT CONTACTS

**If connection fails or need help:**

- IT Support: *(add phone number)*
- Email: *(add support email)*
- VPS Administrator: *(add contact)*

**Include this information when calling:**
- Station name: **Abusha**
- Router model: **QX310**
- Error messages from router logs
- Current VPN status shown on router

---

## 🔄 AFTER SUCCESSFUL CONNECTION

**Inform IT Team:**
- ✅ Abusha VPN is connected
- ✅ VPN IP: 10.99.0.6
- ✅ Router model and firmware version
- ✅ Local OPC UA server IP address (if applicable)

**Next Steps (IT will handle):**
- Configure Django to connect to Abusha OPC UA server
- Add Abusha to monitoring dashboard
- Setup alarm notifications for this station

---

**Configuration Date**: _____________

**Technician Name**: _____________

**Signature**: _____________

---

*Keep this card on site for reference and future maintenance*
