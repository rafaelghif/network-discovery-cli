# Network Discovery CLI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Network Discovery CLI is a robust and efficient command-line tool for network engineers and administrators. It automates the process of discovering and documenting network device configurations by interrogating Cisco devices to retrieve detailed port, neighbor, and system information.

## Architecture

This project is built upon a **Hexagonal (Ports and Adapters) Architecture**. This design pattern isolates the core application logic from external concerns, resulting in a system that is highly maintainable, testable, and extensible.

``` markup
+------------------+      +----------------------+      +------------------+
|   Input          |      |                      |      |   Output         |
|   Adapters       |      |  Application &       |      |   Adapters       |
|  (e.g. CLI)      |----->|  Domain Core         |<-----|  (e.g. SSH,     |
|                  |      |                      |      |   JSON Writer)   |
+------------------+      +----------------------+      +------------------+
```

- **Core**: The `application` and `domain` logic are independent of any specific transport or storage technology.
- **Adapters**: The `adapters` directory contains implementations for interacting with the outside world, such as the command-line interface, SSH/Telnet transports, and file writers.

This separation of concerns means new features (like a web UI or support for a new device vendor) can be added by simply creating new adapters without modifying the core business logic.

## Key Features

- **Extensible by Design**: The Hexagonal Architecture allows for easy extension. Add new transport methods, output formats, or parsers with minimal changes to the core logic.
- **Robust and Resilient**: The tool gracefully handles errors and utilizes fallback commands (`show run` vs. `show running-config`) to adapt to different device platforms (IOS, SMB).
- **Multi-Protocol Connectivity**: Seamlessly connects to devices via SSH, Telnet, or a direct serial connection.
- **In-Depth Data Collection**: Gathers a comprehensive set of data, including detailed neighbor information (CDP/LLDP), port status, switchport mode, VLANs, and PoE status.
- **MAC Address Auditing**: Scans and resolves MAC addresses on each port, enriching the data with vendor details via both offline and online lookups.
- **Flexible Execution**: Supports both a fully interactive mode with guided prompts and a non-interactive mode for automation and scripting.

## Data Collection Commands

To ensure transparency, the tool exclusively uses non-destructive `show` commands to gather information. The primary commands include:

- `show version`
- `show running-config` / `show run`
- `show interfaces status` / `show interface description`
- `show cdp neighbors detail`
- `show lldp neighbors detail`
- `show interface <name> switchport`
- `show mac address-table interface <name>`
- `show power inline <name>`

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS version 18.x or later recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

## Installation

1. **Clone the repository:**

    ```bash
    git clone https://github.com/rafaelghif/network-discovery-cli.git
    cd network-discovery-cli
    ```

2. **Install dependencies:**

    ```bash
    npm install
    ```

3. **Build the project:**

    ```bash
    npm run build
    ```

## Configuration

The tool can be configured via interactive prompts or, for automation, through environment variables.

### All Configuration Options

| Option              | Description                                                                 |
|---------------------|-----------------------------------------------------------------------------|
| `mode`              | Connection method: `SSH`, `Telnet`, or `Serial`.                            |
| `targets`           | Comma-separated IP addresses or hostnames (for `SSH`/`Telnet`).             |
| `comPort`           | The serial port to use (e.g., `COM3`) (for `Serial` mode).                  |
| `baudRate`          | The baud rate for the serial connection (defaults to `9600`).               |
| `credentials`       | An object containing `username`, `password`, and `enableSecret`.            |
| `timeout`           | Connection timeout in milliseconds (defaults to `20000`).                   |
| `legacySsh`         | Set to `true` to enable older SSH algorithms for legacy devices.            |
| `resolveMacVendors` | `Offline` (fast), `Online` (requires internet), or `Disabled`.              |
| `debug`             | Set to `true` to save raw command output for troubleshooting.               |

## Usage

### Interactive Mode

For guided execution, run the tool in interactive mode. It will prompt for all required connection details and credentials.

```bash
npm start
```

### Non-interactive (Automated) Mode

For use in scripts or automated environments, set the `NDC_NON_INTERACTIVE=1` environment variable and provide the configuration in `NDC_CONFIG_JSON`.

**PowerShell:**

```powershell
$env:NDC_NON_INTERACTIVE="1"
$env:NDC_CONFIG_JSON='''{"mode": "SSH", "targets": "192.168.1.1,192.168.1.2", "credentials": {"username": "user", "password": "password"}}'''
npm start
```

**CMD:**

```cmd
set NDC_NON_INTERACTIVE=1
set NDC_CONFIG_JSON={"mode": "SSH", "targets": "192.168.1.1,192.168.1.2", "credentials": {"username": "user", "password": "password"}}
npm start
```

**Bash:**

```bash
export NDC_NON_INTERACTIVE=1
export NDC_CONFIG_JSON='''{"mode": "SSH", "targets": "192.168.1.1,192.168.1.2", "credentials": {"username": "user", "password": "password"}}'''
npm start
```

## Output

The tool generates output files in a directory named after the target device's hostname (e.g., `output/MySwitch/`). Each directory contains:

- `ports.json`: A JSON file with detailed neighbor and interface information.
- `ports.xlsx`: An Excel spreadsheet of the same data for analysis.
- `debug/`: (If `debug: true`) Contains raw command output.

## Project Structure

The codebase is organized as follows:

- `src/`: Main source code.
  - `adapters/`: Connectors for external systems (CLI, parsers, protocols, writers).
  - `application/`: Core application logic and services.
  - `domain/`: Business logic, entities, and domain services.
  - `infrastructure/`: Cross-cutting concerns like logging and event handling.
  - `shared/`: Shared utilities and type definitions.
- `dist/`: Compiled JavaScript output.
- `output/`: Default directory for generated output files.

## Roadmap

Future enhancements being considered for this project include:

- **Multi-Vendor Support**: Extending support to other network device vendors like Juniper (Junos) and Arista (EOS).
- **Web Interface**: A simple web-based UI to visualize discovered network topology and browse results.
- **Configuration Snapshots**: Adding functionality to capture and store device configuration snapshots.
- **Enhanced Data Extraction**: Gathering more detailed information such as VLAN configurations, STP status, and routing tables.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
