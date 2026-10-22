// scenarios.js
//
// Content pool for ROVER-RELINK. Each entry is ONE subsystem the player
// restores by wiring its ROS2 node graph correctly. Same mechanic every
// round (connect ports to the right topic/service channel), different
// correct graph + escalating complexity.
//
// Data model per scenario:
//   nodes[]    : { id, name, x, y, ports:[{ id, kind, label }] }
//                kind: 'pub' | 'sub' | 'client' | 'server'
//                pub/client/server render on the RIGHT edge (outgoing);
//                sub renders on the LEFT edge (incoming).
//   channels[] : { id, name, type:'topic'|'service', x, y, decoy?, server? }
//                'server' names the node that PROVIDES a service (drawn as
//                an always-on dashed endpoint the player doesn't wire).
//   required[] : { portId, channelId }  the set of correct connections.
//                Round completes when the player's connection set == this
//                set exactly (all present, none wrong).
//   feedback   : id used by MainScene to pick the rover visualization.
//   serviceIntro: true -> show the "what is a service" explainer first.
//
// Real ROS2 vocabulary is used throughout so it transfers to a real machine.

export const scenarios = [
  {
    id: "vision",
    title: "1 · Restore Vision",
    brief:
      "The rover is blind. Its LiDAR driver is running but nothing is listening. " +
      "Publish the scan to a topic, and subscribe the display to that same topic.",
    hint: "A publisher and a subscriber only connect if they use the SAME topic name.",
    feedback: "vision",
    nodes: [
      { id: "lidar", name: "lidar_node", x: 400, y: 150,
        ports: [{ id: "lidar_pub", kind: "pub", label: "publishes" }] },
      { id: "display", name: "display_node", x: 940, y: 150,
        ports: [{ id: "display_sub", kind: "sub", label: "subscribes" }] },
    ],
    channels: [
      { id: "scan", name: "/scan", type: "topic", x: 670, y: 150 },
      { id: "cmd_vel", name: "/cmd_vel", type: "topic", x: 670, y: 300, decoy: true },
      { id: "camera", name: "/camera/image", type: "topic", x: 670, y: 430, decoy: true },
    ],
    required: [
      { portId: "lidar_pub", channelId: "scan" },
      { portId: "display_sub", channelId: "scan" },
    ],
  },

  {
    id: "battery",
    title: "2 · Battery Telemetry",
    brief:
      "Power readings aren't reaching the dashboard. Wire the battery monitor's " +
      "stream to the display. Watch the topic names — there are more of them now.",
    hint: "Streaming values that update forever = a topic. Pick the RIGHT topic among the decoys.",
    feedback: "battery",
    nodes: [
      { id: "battery", name: "battery_node", x: 400, y: 160,
        ports: [{ id: "battery_pub", kind: "pub", label: "publishes" }] },
      { id: "display", name: "display_node", x: 940, y: 260,
        ports: [{ id: "display_sub", kind: "sub", label: "subscribes" }] },
    ],
    channels: [
      { id: "battery_state", name: "/battery_state", type: "topic", x: 670, y: 150 },
      { id: "scan", name: "/scan", type: "topic", x: 670, y: 280, decoy: true },
      { id: "temp", name: "/temperature", type: "topic", x: 670, y: 410, decoy: true },
    ],
    required: [
      { portId: "battery_pub", channelId: "battery_state" },
      { portId: "display_sub", channelId: "battery_state" },
    ],
  },

  {
    id: "teleop",
    title: "3 · Manual Drive",
    brief:
      "Get the rover moving. The teleop node reads your keys and publishes velocity " +
      "commands; the motor controller must subscribe to them. Wire it, then drive.",
    hint: "Input in, actuator out. What topic do drive commands travel on?",
    feedback: "teleop",
    nodes: [
      { id: "teleop", name: "teleop_node", x: 400, y: 170,
        ports: [{ id: "teleop_pub", kind: "pub", label: "publishes" }] },
      { id: "motor", name: "motor_node", x: 940, y: 170,
        ports: [{ id: "motor_sub", kind: "sub", label: "subscribes" }] },
    ],
    channels: [
      { id: "cmd_vel", name: "/cmd_vel", type: "topic", x: 670, y: 160 },
      { id: "scan", name: "/scan", type: "topic", x: 670, y: 290, decoy: true },
      { id: "battery_state", name: "/battery_state", type: "topic", x: 670, y: 420, decoy: true },
    ],
    required: [
      { portId: "teleop_pub", channelId: "cmd_vel" },
      { portId: "motor_sub", channelId: "cmd_vel" },
    ],
  },

  {
    id: "charge",
    title: "4 · Charging Station",
    brief:
      "Battery is low. The rover shouldn't stream endlessly here — it needs to ASK the " +
      "charger for a top-up and WAIT for it to finish. That's a service, not a topic.",
    hint: "A one-off request that expects a reply = a service. Don't be fooled by the topic decoy.",
    feedback: "charge",
    serviceIntro: true,
    nodes: [
      { id: "rover", name: "rover_node", x: 400, y: 190,
        ports: [{ id: "rover_client", kind: "client", label: "calls (client)" }] },
      { id: "charger", name: "charger_node", x: 940, y: 190,
        ports: [] },
    ],
    channels: [
      { id: "charge_srv", name: "/request_charge", type: "service", x: 670, y: 180, server: "charger" },
      { id: "power_stream", name: "/power_level", type: "topic", x: 670, y: 330, decoy: true },
    ],
    required: [
      { portId: "rover_client", channelId: "charge_srv" },
    ],
  },

  {
    id: "greenhouse",
    title: "5 · Greenhouse Life-Support",
    brief:
      "The full stack. The soil sensor streams moisture to the controller. The controller " +
      "streams UV commands to the lamp — and CALLS the sprinkler's irrigation service when " +
      "it's dry. Mix of topics and a service. Bring the crops back.",
    hint: "Streams are topics (moisture, UV). The 'run one irrigation cycle' action is a service.",
    feedback: "greenhouse",
    nodes: [
      { id: "soil", name: "soil_sensor", x: 380, y: 120,
        ports: [{ id: "soil_pub", kind: "pub", label: "publishes" }] },
      { id: "controller", name: "controller_node", x: 380, y: 340,
        ports: [
          { id: "ctrl_sub", kind: "sub", label: "subscribes" },
          { id: "ctrl_client", kind: "client", label: "calls (client)" },
          { id: "ctrl_pub", kind: "pub", label: "publishes" },
        ] },
      { id: "sprinkler", name: "sprinkler_node", x: 960, y: 330, ports: [] },
      { id: "uvlamp", name: "uv_lamp_node", x: 960, y: 520,
        ports: [{ id: "uv_sub", kind: "sub", label: "subscribes" }] },
    ],
    channels: [
      { id: "soil_moisture", name: "/soil_moisture", type: "topic", x: 680, y: 130 },
      { id: "temp", name: "/temperature", type: "topic", x: 680, y: 250, decoy: true },
      { id: "irrigation_srv", name: "/run_irrigation", type: "service", x: 680, y: 360, server: "sprinkler" },
      { id: "uv_command", name: "/uv_command", type: "topic", x: 680, y: 500 },
    ],
    required: [
      { portId: "soil_pub", channelId: "soil_moisture" },
      { portId: "ctrl_sub", channelId: "soil_moisture" },
      { portId: "ctrl_client", channelId: "irrigation_srv" },
      { portId: "ctrl_pub", channelId: "uv_command" },
      { portId: "uv_sub", channelId: "uv_command" },
    ],
  },
];
