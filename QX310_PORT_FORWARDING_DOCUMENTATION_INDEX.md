# QX310 Firewall Port Forwarding - Complete Documentation Index

## 📚 Documentation Suite

You now have a complete guide to configure firewall port forwarding on your Qixiang QX310 router. Choose the right document based on your needs:

---

## 🚀 Quick Start (Read This First!)

**Start here if you want to get running in 15 minutes:**

→ [QX310_PORT_FORWARDING_QUICK.md](QX310_PORT_FORWARDING_QUICK.md)

**Contains:**
- 5-minute setup guide
- Pre-filled rule templates
- Visual field layouts
- 60-second troubleshooting matrix
- Copy-paste commands

**Who should use this:**
- Experienced with routers
- Just need the essentials
- Don't need detailed explanations

---

## ✅ Step-by-Step Checklist (Recommended!)

**Use this if you want structured, checkable steps:**

→ [QX310_PORT_FORWARDING_SETUP_CHECKLIST.md](QX310_PORT_FORWARDING_SETUP_CHECKLIST.md)

**Contains:**
- Pre-setup verification checklist
- Step-by-step checkboxes for each action
- What to do if something fails at each step
- Testing procedures with expected results
- Multi-station setup instructions
- Production readiness checklist

**Who should use this:**
- First-time setup
- Want to ensure nothing is missed
- Need step-by-step guidance
- Like breaking work into checkboxes

**Estimated time:** 30-60 minutes including testing

---

## 📖 Complete Reference Guide

**For comprehensive understanding and all details:**

→ [QX310_FIREWALL_PORT_FORWARDING.md](QX310_FIREWALL_PORT_FORWARDING.md)

**Contains:**
- What is port forwarding and why it's needed
- Network topology diagrams
- Complete step-by-step instructions
- Security hardening recommendations
- Multiple service examples (OPC UA, Web, SSH, Modbus)
- Integration with ROAMS backend
- Advanced configurations (ACLs, firewalls)
- Performance optimization
- Backup strategies
- Best practices

**Who should use this:**
- Want to deeply understand port forwarding
- Need security hardening advice
- Setting up multiple services
- Want to learn best practices
- Need references for documentation

**Estimated time to read:** 45-60 minutes

---

## 🔧 Troubleshooting Guide (When Things Go Wrong)

**If port forwarding isn't working or behaving oddly:**

→ [QX310_PORT_FORWARDING_TROUBLESHOOTING.md](QX310_PORT_FORWARDING_TROUBLESHOOTING.md)

**Contains:**
- 7 common symptoms with detailed diagnosis
- Step-by-step debugging procedures
- Network commands to find the problem
- Solution for each issue
- Diagnostic script you can run
- When to contact support
- Preventive measures

**Who should use this:**
- Connection timeout errors
- "Connection refused" messages
- Port works but OPC UA fails
- Intermittent connectivity
- Can reach internally but not via VPN
- Router access issues

**Most common issues covered:**
1. Connection refused
2. Connection timeout
3. Port works, OPC UA fails
4. Intermittent connections
5. Port already in use
6. Works internally, not from VPN
7. Can't reach router

---

## 🔗 Related Documentation

### VPN Setup (Must Do First!)
→ [QX310_L2TP_SETUP_GUIDE.md](QX310_L2TP_SETUP_GUIDE.md)
- Configure L2TP/IPsec on QX310 router
- Connect to VPS VPN
- **Must complete before port forwarding**

### VPN Server Setup on VPS
→ [L2TP_IPSEC_VPN_SETUP.md](L2TP_IPSEC_VPN_SETUP.md)
- Full L2TP/IPsec server installation
- Firewall configuration
- Client setup across platforms

→ [VPN_SERVER_SETUP_GUIDE.md](VPN_SERVER_SETUP_GUIDE.md)
- OpenVPN alternative
- Can run both VPN types simultaneously

---

## 📋 How to Use This Documentation

### Scenario 1: Setting Up for the First Time
1. **Start here:** QX310_L2TP_SETUP_GUIDE.md (get VPN working first!)
2. **Then use:** QX310_PORT_FORWARDING_SETUP_CHECKLIST.md (step-by-step)
3. **Reference:** QX310_PORT_FORWARDING_QUICK.md (for field layouts)
4. **If stuck:** QX310_PORT_FORWARDING_TROUBLESHOOTING.md

**Estimated total time:** 1-2 hours

### Scenario 2: Quick Setup (Experienced)
1. **Read:** QX310_PORT_FORWARDING_QUICK.md (5 minutes)
2. **Execute:** Follow the quick 5-minute setup
3. **Test:** Use telnet commands to verify
4. **Done:** Should be operational in 15-20 minutes

**Estimated total time:** 15-20 minutes

### Scenario 3: Something's Broken
1. **Go to:** QX310_PORT_FORWARDING_TROUBLESHOOTING.md
2. **Find:** Symptoms that match your issue
3. **Follow:** Diagnostic steps
4. **Apply:** Solutions
5. **Still stuck?** Run the diagnostic script and contact support

**Estimated total time:** 15-45 minutes (depending on complexity)

### Scenario 4: Deep Dive / Learning
1. **Read:** QX310_FIREWALL_PORT_FORWARDING.md (complete guide)
2. **Reference:** Diagrams, examples, security sections
3. **Then execute:** QX310_PORT_FORWARDING_SETUP_CHECKLIST.md
4. **Advanced:** Security hardening section

**Estimated total time:** 2-3 hours

---

## 🎯 Common Tasks Quick Reference

### "I just want to get OPC UA working"
1. Go to: **QX310_PORT_FORWARDING_SETUP_CHECKLIST.md**
2. Follow section: **Step 3: Create Port Forwarding Rule**
3. Use template:
   - External: 4840
   - Internal: 192.168.1.100:4840
   - Protocol: TCP
4. Test with: `telnet 10.99.0.2 4840`

### "I need to understand how it works"
1. Go to: **QX310_FIREWALL_PORT_FORWARDING.md**
2. Read: Sections 1-3 (Overview to Network Topology)
3. Then follow: Sections 4-5 (Examples and Configuration)

### "Port forwarding isn't working"
1. Go to: **QX310_PORT_FORWARDING_TROUBLESHOOTING.md**
2. Find the symptom that matches yours
3. Follow the diagnostic steps
4. Apply the solution

### "I need to set up multiple stations"
1. Go to: **QX310_FIREWALL_PORT_FORWARDING.md**
2. Read: Section 9 (Multiple Services - Advanced)
3. Or use: **QX310_PORT_FORWARDING_SETUP_CHECKLIST.md** → Step 9

### "I'm integrating with ROAMS"
1. Go to: **QX310_FIREWALL_PORT_FORWARDING.md**
2. Read: Section 10 (Integration with ROAMS Backend)
3. Update ROAMS OPC UA endpoints with VPN IPs

---

## 📊 Document Comparison Matrix

| Document | Level | Time | Best For | Contains |
|----------|-------|------|----------|----------|
| **Quick** | Beginner | 5 min | Fast setup | Essentials only |
| **Checklist** | Beginner | 30-60 min | Guided setup | Steps with checks |
| **Complete** | Advanced | 45 min read | Deep learning | Everything |
| **Troubleshooting** | Advanced | Variable | Problem solving | Diagnosis & fixes |

---

## 🔑 Key Concepts Summary

### What is Port Forwarding?

```
Router receives connection on port 4840
         ↓
Matching port forwarding rule found
         ↓
Forwards to internal device 192.168.1.100:4840
         ↓
OPC UA server responds
         ↓
Response goes back to requester
```

### Why You Need It

- **Without:** External devices cannot access internal services
- **With:** External VPN users (like ROAMS backend) can access services

### Security with L2TP/IPsec

- ✅ **Only VPN users** (10.99.0.0/24) can access forwarded ports
- ✅ **Not exposed to internet** (not accessible from random IPs)
- ✅ **Encrypted tunnel** (all traffic encrypted)
- ✅ **Authentication required** (must connect to VPN first)

---

## 🧪 Testing Your Setup

### Level 1: Basic Test
```bash
telnet 10.99.0.2 4840
# Expected: Connected or Connection established
```

### Level 2: Detailed Test
```bash
nc -zv 10.99.0.2 4840
# Shows: Connection successful or Connection refused
```

### Level 3: OPC UA Test (ROAMS)
```bash
python3 << 'EOF'
from opcua import Client
client = Client("opc.tcp://10.99.0.2:4840")
client.connect()
print("✅ OPC UA working!")
client.disconnect()
EOF
```

### Level 4: ROAMS Dashboard Test
1. Open ROAMS dashboard: `https://YOUR_DOMAIN`
2. Navigate to Analysis page
3. Select Bombo station
4. Should see live data flowing
5. Check timestamps update in real-time

**All 4 levels pass? Ready for production!** ✅

---

## 📞 When to Use Each Document

| Question | Answer | Document |
|----------|--------|----------|
| How do I set up port forwarding? | Step-by-step | Checklist |
| What does port forwarding do? | Theory & examples | Complete |
| How do I test if it works? | Multiple methods | Checklist + Quick |
| What if it doesn't work? | Diagnosis & fixes | Troubleshooting |
| Where's the field I need to fill? | Visual layouts | Quick |
| How do I secure this? | Security best practices | Complete |
| How do I do multiple stations? | Multi-station examples | Complete |
| I forgot what external port was | Configuration backup | Checklist → Step 8 |
| Can I integrate with ROAMS? | Yes! Steps provided | Complete → Section 10 |

---

## ⚡ Pro Tips

### Before Starting
- [ ] Have manufacturer's default password for router (check back of device)
- [ ] Know internal device IP (ping it from another device)
- [ ] Test internal service first (telnet 192.168.1.100 4840)
- [ ] Have VPS IP ready (144.91.79.167 or similar)

### During Setup
- [ ] Take screenshots of each step (helps with troubleshooting)
- [ ] Write down rule details on paper (backup to your notes)
- [ ] Test immediately after saving (don't wait)
- [ ] Don't change multiple things at once (change one, test, repeat)

### After Setup
- [ ] Create backup of router config (System → Backup)
- [ ] Document all port forwarding rules (create text file)
- [ ] Test weekly with telnet command
- [ ] Monitor for uptime issues (should be days, not hours)

---

## 🎓 Learning Path

### Beginner Path (Just Make It Work)
```
Start
  ↓
QX310_L2TP_SETUP_GUIDE.md (get VPN working)
  ↓
QX310_PORT_FORWARDING_QUICK.md (5-minute setup)
  ↓
Test with telnet
  ↓
Done! ✅
```

### Intermediate Path (Understand It)
```
Start
  ↓
QX310_L2TP_SETUP_GUIDE.md (VPN)
  ↓
QX310_FIREWALL_PORT_FORWARDING.md (theory)
  ↓
QX310_PORT_FORWARDING_SETUP_CHECKLIST.md (practice)
  ↓
Test & verify
  ↓
Document & backup
  ↓
Done! ✅
```

### Advanced Path (Master It)
```
Start
  ↓
Read all four documents in order
  ↓
Set up multiple stations
  ↓
Add security hardening (ACLs, etc)
  ↓
Monitor and optimize
  ↓
Create runbooks for team
  ↓
Done! ✅
```

---

## 📋 Checklist: Things You Need Before Starting

- [ ] **Router access:** Can you login to 192.168.1.1? ✓
- [ ] **Internal service:** Is OPC UA/service running on internal device? ✓
- [ ] **Internal connectivity:** Can you telnet 192.168.1.100 4840? ✓
- [ ] **VPN connection:** Is L2TP connected to VPS? ✓
- [ ] **VPN IP:** Can you ping 10.99.0.1 from VPS? ✓
- [ ] **Documentation:** Saved all credentials? ✓
- [ ] **Time:** Do you have 30-60 minutes uninterrupted? ✓

All checked? **You're ready to start!** 🚀

---

## 🐛 Common Typos to Avoid

| Wrong | Correct | Why |
|-------|---------|-----|
| 192.168.1.1.100 | 192.168.1.100 | Don't add extra numbers |
| 192,168,1,100 | 192.168.1.100 | Use dots, not commas |
| 4840/TCP | 4840 | Port number only in field |
| TCP/UDP | Select one or TCP+UDP | Don't type the slash |
| externalport | External Port | Correct field names |

---

## 🔄 Document Relationships

```
VPN Guides (Must Do First)
  ├─ L2TP_IPSEC_VPN_SETUP.md (server setup)
  └─ QX310_L2TP_SETUP_GUIDE.md (router client setup)

Port Forwarding Guides (Then Do This)
  ├─ QX310_PORT_FORWARDING_QUICK.md (fast path)
  ├─ QX310_PORT_FORWARDING_SETUP_CHECKLIST.md (guided path)
  ├─ QX310_FIREWALL_PORT_FORWARDING.md (complete reference)
  └─ QX310_PORT_FORWARDING_TROUBLESHOOTING.md (debug path)

ROAMS Integration (Final Step)
  └─ Update OPC UA endpoints in Django backend
```

---

## 📞 Getting Help

### Quick Questions
- **Q:** What's the default port for OPC UA?
- **A:** 4840 (see QX310_PORT_FORWARDING_QUICK.md)

### How-To Questions
- **Q:** How do I create a port forwarding rule?
- **A:** See QX310_PORT_FORWARDING_SETUP_CHECKLIST.md → Step 3

### Troubleshooting Questions
- **Q:** Connection times out, what do I do?
- **A:** QX310_PORT_FORWARDING_TROUBLESHOOTING.md → Symptom 2

### Advanced Questions
- **Q:** How do I secure port forwarding with ACLs?
- **A:** QX310_FIREWALL_PORT_FORWARDING.md → Section 10 (Advanced)

---

## ✨ Success Criteria

Your setup is successful when:

✅ **Port forwarding rule created**
- Rule exists in router configuration
- Rule shows as Enabled
- Correct ports and IP address

✅ **Connectivity verified**
- `telnet 10.99.0.2 4840` returns "Connected"
- No "Connection refused" or "Timeout"

✅ **OPC UA working**
- ROAMS backend connects to OPC UA
- Can request node data
- Data updates every 20 seconds

✅ **Stability confirmed**
- Connection stays up for 24+ hours
- No random disconnects
- Data flow is continuous

✅ **Documentation complete**
- Backup config file saved
- Rules documented
- Team trained

---

## 📝 Document Version Info

| Document | Version | Updated | Status |
|----------|---------|---------|--------|
| Quick Reference | 1.0 | Feb 2026 | ✅ Complete |
| Setup Checklist | 1.0 | Feb 2026 | ✅ Complete |
| Complete Guide | 1.0 | Feb 2026 | ✅ Complete |
| Troubleshooting | 1.0 | Feb 2026 | ✅ Complete |
| Index (this file) | 1.0 | Feb 2026 | ✅ Complete |

**All documentation is production-ready and tested.** 🎉

---

## 🎯 Next Steps

1. **Choose your path:**
   - Fast setup? → Use **Quick** guide
   - Want guidance? → Use **Checklist**
   - Need details? → Use **Complete** guide
   - Something broken? → Use **Troubleshooting**

2. **Follow the steps**
   - Don't skip steps
   - Check boxes as you go
   - Test at each stage

3. **Get verification**
   - Test with telnet first
   - Test OPC UA second
   - Test ROAMS dashboard third
   - Should work immediately

4. **Document & Backup**
   - Create config backup
   - Write down rules
   - Save in safe place

5. **Monitor & Maintain**
   - Weekly: Test port connectivity
   - Monthly: Check router uptime
   - Quarterly: Verify backup

---

**Ready to get started? Pick a document above and begin! Good luck!** 🚀

---

*Last Updated: February 15, 2026*  
*Covers: QX310 Firmware 3.x - 5.x*  
*Status: Production Ready ✅*
