# Network Discovery CLI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Network Discovery CLI is a robust and efficient command-line tool designed for network administrators and engineers to discover and document network device connectivity. It interrogates Cisco switches to retrieve detailed information about network neighbors and individual port configurations.

## Key Features

- **Multi-Protocol Support**: Seamlessly connects to devices via SSH, Telnet, or direct serial connection.
- **Neighbor Discovery**: Leverages both CDP (Cisco Discovery Protocol) and LLDP (Link Layer Discovery Protocol) to identify connected network devices and their specific ports.
- **Detailed Port Analysis**: Gathers critical port-level details including description, operational status, switchport mode (Access/Trunk), VLAN assignments, and Power over Ethernet (PoE) status.
- **MAC Address Auditing**: Scans the MAC address table for each port and enriches this data with vendor information using both offline and online lookups.
- **Flexible Execution Modes**: Operates interactively with user-friendly prompts or non-interactively for integration into automated scripts and workflows.
- **Versatile Output Options**: Exports all discovered data to both human-readable Excel (`.xlsx`) and machine-readable JSON formats.
- **In-depth Debugging**: Provides a debug mode that captures and saves raw command output for effective troubleshooting.
- **Legacy Device Compatibility**: Includes support for legacy SSH encryption algorithms to ensure connectivity with older network hardware.

**Note**: Telnet support is currently in a maintenance phase and may exhibit unexpected behavior.

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

## Usage

### Interactive Mode

For guided execution, run the tool in interactive mode. It will prompt for all required connection details and credentials.

```bash
npm start
```

### Non-interactive (Automated) Mode

For use in scripts or automated environments, configure the tool with environment variables.

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

#### Configuration Variables

- `NDC_NON_INTERACTIVE`: Set to `1` to enable non-interactive mode.
- `NDC_CONFIG_JSON`: A JSON string containing the configuration object.
  - `mode`: Connection mode (`SSH`, `Telnet`, or `Serial`).
  - `targets`: A comma-separated string of target IP addresses or hostnames.
  - `credentials`: An object with `username` and `password`.

## Output

The tool generates output files in a directory named after the target device's hostname (e.g., `output/MySwitch/`). Each directory contains:

- `ports.json`: A JSON file with detailed neighbor and interface information.
- `ports.xlsx`: An Excel spreadsheet of the same data for analysis.
- `debug/`: (Optional) If debug mode is enabled, this directory contains raw command output.

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
