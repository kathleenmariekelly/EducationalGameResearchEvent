// ===========================================================================
// CmdLine Rescue — Level & Puzzle Data
// Each level teaches a networking concept. Checkpoints hold puzzles.
// Puzzle types:
//   "mc"    -> multiple choice (choices[], answer index)
//   "cmd"   -> type a CLI command (accept[] = valid answers, case-insensitive)
// ===========================================================================

const LEVELS = [
  {
    name: "Level 1: The Command Line",
    concept: "CLI Navigation",
    recap:
      "CLI RECAP\n• pwd = print working directory (where you are)\n• ls = list files, cd = change directory\n• cat reads a file; man shows the manual for a command.",
    intro: {
      art: "  [ ACT 1 ]",
      title: "The Signal",
      text:
        "Your friend Ada vanished while tracing a rogue signal across the network.\n" +
        "Her last message: \"They locked me behind the firewall. Follow the packets...\"\n\n" +
        "You boot an old rescue terminal. First — remember how to move around a machine.",
    },
    color: "#33ff66",
    checkpoints: [
      {
        topic: "CLI",
        title: "Where am I?",
        type: "cmd",
        question:
          "You just logged in. Print the <b>full path of your current directory</b> to get your bearings.",
        accept: ["pwd"],
        hint: "Print Working Directory.",
      },
      {
        topic: "CLI",
        title: "Look around",
        type: "cmd",
        question:
          "You need to see what files are here. Type the command to <b>list directory contents</b>.",
        accept: ["ls", "ls -l", "ls -la", "ls -a", "dir"],
        hint: "Two letters. 'list'.",
      },
      {
        topic: "CLI",
        title: "Move in",
        type: "cmd",
        question:
          "There's a folder called <code>net_logs</code>. <b>Change into that directory.</b>",
        accept: ["cd net_logs", "cd net_logs/", "cd ./net_logs"],
        hint: "cd = change directory.",
      },
      {
        topic: "CLI",
        title: "Read the log",
        type: "cmd",
        question:
          "A file <code>trace.log</code> holds a clue. <b>Print its contents</b> to the screen.",
        accept: ["cat trace.log", "less trace.log", "more trace.log"],
        hint: "cat <file> dumps a file's contents.",
      },
      {
        topic: "CLI",
        title: "Who am I?",
        type: "cmd",
        question: "Confirm which user account you're operating as. Type the command.",
        accept: ["whoami", "id"],
        hint: "whoami prints your current username.",
      },
    ],
  },
  {
    name: "Level 2: Layers of the Net",
    concept: "TCP/IP & OSI Model",
    recap:
      "OSI RECAP\n• 7 layers: Physical→Data Link→Network→Transport→Session→Presentation→Application\n• IP = logical address (routing); MAC = physical address\n• TCP = reliable/ordered; routers work at Layer 3.",
    intro: {
      art: "  [ ACT 2 ]",
      title: "The Stack",
      text:
        "The logs mention data passing through 'layers'. To follow the trail you must\n" +
        "understand how machines actually talk to each other.",
    },
    color: "#33e0ff",
    checkpoints: [
      {
        topic: "MODEL",
        title: "The OSI Model",
        type: "mc",
        question: "How many layers are in the OSI model?",
        choices: ["4 layers", "5 layers", "7 layers", "12 layers"],
        answer: 2,
        hint: "Please Do Not Throw Sausage Pizza Away.",
      },
      {
        topic: "ADDRESS",
        title: "IP vs MAC",
        type: "mc",
        question:
          "Which address is used to route data across different networks (logical, changeable)?",
        choices: ["MAC address", "IP address", "Port number", "Hostname"],
        answer: 1,
        hint: "MAC is physical & permanent; this one is logical.",
      },
      {
        topic: "PROTOCOL",
        title: "Reliable delivery",
        type: "mc",
        question:
          "You need every packet to arrive, in order, with confirmation. Which protocol?",
        choices: ["UDP", "TCP", "ICMP", "ARP"],
        answer: 1,
        hint: "It does a 3-way handshake.",
      },
      {
        topic: "MODEL",
        title: "Application layer",
        type: "mc",
        question: "Which OSI layer do protocols like HTTP, DNS and FTP live at?",
        choices: ["Layer 3 (Network)", "Layer 4 (Transport)", "Layer 7 (Application)", "Layer 1 (Physical)"],
        answer: 2,
        hint: "Apps talk at the top: Layer 7.",
      },
    ],
  },
  {
    name: "Level 3: TCP vs UDP",
    recap:
      "TRANSPORT RECAP\n• TCP: reliable, ordered, connection-oriented (SYN→SYN-ACK→ACK)\n• UDP: fast, connectionless, no retransmit (good for live media)\n• Ports: 80 HTTP, 443 HTTPS, 22 SSH, 53 DNS.",
    concept: "Transport Protocols",
    intro: {
      art: "  [ ACT 3 ]",
      title: "The Handshake",
      text:
        "Ada's signal splits into two streams: one careful and confirmed, one fast and loose.\n" +
        "Choose the right transport to keep tracing her.",
    },
    color: "#ffcc33",
    checkpoints: [
      {
        topic: "TCP",
        title: "The 3-Way Handshake",
        type: "mc",
        question: "What is the correct order of the TCP handshake?",
        choices: [
          "ACK -> SYN -> SYN-ACK",
          "SYN -> SYN-ACK -> ACK",
          "SYN -> ACK -> FIN",
          "PING -> PONG -> ACK",
        ],
        answer: 1,
        hint: "It starts by synchronizing (SYN).",
      },
      {
        topic: "UDP",
        title: "Speed over safety",
        type: "mc",
        question:
          "A live video call drops a frame but keeps going smoothly. Which protocol fits best?",
        choices: [
          "TCP — retransmit the frame",
          "UDP — connectionless, no retransmit",
          "FTP",
          "SMTP",
        ],
        answer: 1,
        hint: "Real-time media favors speed over guaranteed delivery.",
      },
      {
        topic: "PORTS",
        title: "Well-known ports",
        type: "mc",
        question: "Which port does HTTPS use by default?",
        choices: ["21", "80", "443", "22"],
        answer: 2,
        hint: "80 is HTTP; the secure version adds encryption.",
      },
      {
        topic: "PORTS",
        title: "Secure shell",
        type: "mc",
        question: "Which port does SSH listen on by default?",
        choices: ["22", "23", "25", "3389"],
        answer: 0,
        hint: "SSH = port 22 (Telnet, the insecure one, is 23).",
      },
    ],
  },
  {
    name: "Level 4: Tools of the Trace",
    recap:
      "DIAGNOSTICS RECAP\n• ping = is the host reachable? (ICMP echo)\n• traceroute/tracert = show every hop on the path\n• nslookup/dig = resolve a domain name to an IP (DNS).",
    concept: "Network Diagnostics",
    intro: {
      art: "  [ ACT 4 ]",
      title: "Cornered",
      text:
        "You're close. The firewall host is somewhere in this subnet.\n" +
        "Use real diagnostic tools to pin down Ada's location.",
    },
    color: "#ff66cc",
    checkpoints: [
      {
        topic: "TOOL",
        title: "Is the host alive?",
        type: "cmd",
        question:
          "Test connectivity to the host <code>10.0.0.42</code> by sending ICMP echo requests.",
        accept: ["ping 10.0.0.42", "ping 10.0.0.42 "],
        hint: "The classic reachability tool: ping <ip>.",
      },
      {
        topic: "TOOL",
        title: "Trace the path",
        type: "cmd",
        question:
          "Map every hop between you and <code>10.0.0.42</code>. Type the trace command (Linux).",
        accept: ["traceroute 10.0.0.42", "tracert 10.0.0.42"],
        hint: "traceroute on Linux/mac, tracert on Windows.",
      },
      {
        topic: "DNS",
        title: "Name to number",
        type: "cmd",
        question:
          "Resolve the domain <code>ada.rescue.net</code> to its IP address using a DNS lookup tool.",
        accept: [
          "nslookup ada.rescue.net",
          "dig ada.rescue.net",
          "host ada.rescue.net",
        ],
        hint: "nslookup or dig <domain>.",
      },
      {
        topic: "TOOL",
        title: "Who owns this IP?",
        type: "cmd",
        question: "Show your machine's own network interfaces and IP addresses (Linux/mac).",
        accept: ["ifconfig", "ip addr", "ip a", "ipconfig"],
        hint: "ifconfig or 'ip addr' lists your interfaces.",
      },
    ],
  },
];

// Final-boss hacking mini-quest — rapid-fire questions to breach "The Warden" firewall.
const BOSS = {
  name: "The Warden",
  integrity: 5, // number of correct hacks needed
  questions: [
    {
      q: "BREACH 1 — The Warden hides behind NAT. What does NAT translate?",
      choices: ["MAC ↔ IP", "Private ↔ Public IP addresses", "Domain ↔ IP", "TCP ↔ UDP"],
      answer: 1,
      tip: "Network Address Translation maps private IPs to a public one.",
    },
    {
      q: "BREACH 2 — Force a port scan. Which tool enumerates open ports?",
      choices: ["nmap", "grep", "chmod", "echo"],
      answer: 0,
      tip: "nmap is the classic network mapper / port scanner.",
    },
    {
      q: "BREACH 3 — The firewall filters by port. Block SSH by targeting which port?",
      choices: ["25", "22", "53", "443"],
      answer: 1,
      tip: "SSH listens on port 22.",
    },
    {
      q: "BREACH 4 — Intercept traffic. Which protocol resolves IP → MAC on a LAN?",
      choices: ["DNS", "ARP", "DHCP", "ICMP"],
      answer: 1,
      tip: "ARP = Address Resolution Protocol.",
    },
    {
      q: "BREACH 5 — Final lock. Which layer of the OSI model does a router operate at?",
      choices: ["Layer 2 (Data Link)", "Layer 3 (Network)", "Layer 4 (Transport)", "Layer 7 (Application)"],
      answer: 1,
      tip: "Routers make decisions using IP addresses = Layer 3.",
    },
  ],
};

const OUTRO = {
  art: "  \\o/  ADA FREED",
  title: "Connection Established",
  text:
    "traceroute complete. You reach the firewall host, drop the rule blocking Ada,\n" +
    "and her terminal reconnects: \"You made it. You really learned the net.\"\n\n" +
    "You navigated the CLI, climbed the OSI stack, mastered TCP & UDP, and traced\n" +
    "the route home. Mission accomplished, operator.",
};
