# PIA Relay

## Documentation

- [PIA manual connections](https://github.com/pia-foss/manual-connections/blob/master/README.md) — how PIA's own WireGuard and port forwarding scripts work.
- [Outbound traffic in StartOS](https://github.com/Start9Labs/start-technologies/blob/master/projects/start-os/docs/src/outbound-traffic.md) — choosing which gateway a service uses.

## What you get on StartOS

PIA Relay keeps a connection to Private Internet Access open and renews it for you, so you never paste a new PIA config. It does not change anything by itself: you import one gateway into StartOS, then choose that gateway for each service you want to send through PIA. Services you leave alone keep using your normal connection.

## Getting set up

1. Complete the **Set PIA Login** prompt with your PIA username and password.
2. Optional: run **Choose Region** to pick a PIA location. The default picks the fastest one.
3. Start the service and wait for the **PIA Tunnel** check to turn green.
4. Run **Show Gateway Config** and copy or download the config.
5. In **System → Gateways**, add a gateway and paste that config. Import it once; it does not expire.
6. On each service you want to send through PIA, open its **Outbound Traffic** tab and choose the new gateway.
7. Leave the relay's own **Outbound Traffic** on **Use system gateway**, and never choose the relay's gateway for the whole system. The relay needs your normal connection to reach PIA.

## Using PIA Relay

- **View Status** shows the connected region, the server, when the tunnel came up and when it will next renew.
- **Choose Region** switches location. The connection restarts for a few seconds.
- **Set PIA Login** replaces the saved username and password.

Roughly every twelve hours the relay renews its connection with PIA. During those few seconds, services using the gateway have no connection rather than falling back to your normal one.

If the relay or the PIA tunnel is down, services using its gateway lose their connection until it is back. Nothing is rerouted through your home connection.

The relay carries IPv4 only. IPv6 traffic from services using the gateway is dropped.

## Limitations

- Port forwarding is not supported, so a service that wants inbound connections through PIA (for example slskd peers connecting to you) works outbound only.
- Your PIA password is stored in this service's data and is included in its backups.
- Do not enable a public address on the **Relay Endpoint** interface. It only needs to be reachable from your own server.
