# Network Discovery CLI

A CLI tool to discover Cisco switch neighbors and per-port details using CDP and LLDP.

## Features

* **Multiple Connection Modes**: Supports SSH, Telnet (Note: Telnet support is currently in a maintenance phase and may have bugs), and direct serial connections.
* **Neighbor Discovery**: Gathers detailed information about connected Cisco devices using CDP and LLDP protocols.
* **MAC Vendor Lookup**: Identifies the vendor of a device's MAC address. It uses a fast offline lookup against the IEEE OUI database and can be configured to use an online API (`macvendors.com`) for more extensive checks.
* **Interactive & Non-interactive Modes**: Can be run with interactive prompts or configured via environment variables for automated execution.
* **Flexible Output**: Saves discovered data in both JSON and Excel formats.
* **Debug Mode**: Provides an option to save raw command output for troubleshooting.
* **Legacy SSH Support**: Includes options for connecting to older devices with outdated SSH algorithms.

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

To run the tool in interactive mode, which will prompt you for all necessary information, use the following command:

```bash
npm start
```

The CLI will guide you through selecting a connection mode, entering target device details, and providing credentials.

### Non-interactive Mode

For automated use, you can run the tool in non-interactive mode by setting environment variables.

**PowerShell:**

```powershell
$env:NDC_NON_INTERACTIVE="1"
$env:NDC_CONFIG_JSON='{"mode": "SSH", "targets": "192.168.1.1,192.168.1.2", "credentials": {"username": "user", "password": "password"}}'
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
export NDC_CONFIG_JSON='{"mode": "SSH", "targets": "192.168.1.1,192.168.1.2", "credentials": {"username": "user", "password": "password"}}'
npm start
```

## Output

The tool generates output files in the `output/session-<timestamp>` directory for each run. This includes:

* `discovery_results.json`: A JSON file containing the discovered neighbor and interface details.
* `discovery_results.xlsx`: An Excel spreadsheet with the same data for easier viewing and analysis.
* `debug/`: If debug mode is enabled, this directory will contain the raw output from the executed commands.

## Project Structure

* `src/`: The main source code directory.
  * `adapters/`: Contains code for interacting with external systems (CLI, parsers, transport protocols, writers).
  * `application/`: Core application logic (e.g., `DiscoveryService`).
  * `domain/`: Business logic and entities (e.g., `Device`, `Interface`).
  *`infrastructure/`: Cross-cutting concerns like logging and event handling.
    * `shared/`: Shared utilities and type definitions.
* `dist/`: The compiled JavaScript output directory.
* `output/`: Default directory for generated output files.

## Key Dependencies

* [inquirer](https://github.com/SBoudrias/Inquirer.js): For interactive command-line prompts.
* [ssh2](https://github.com/mscdex/ssh2): SSH2 client module for Node.js.
* [telnet-client](https://github.com/mvdnes/telnet-client): A simple Telnet client for Node.js.
* [serialport](https://github.com/serialport/node-serialport): Access serial ports for communication.
* [winston](https://github.com/winstonjs/winston): A multi-transport async logging library.
* [xlsx](https://sheetjs.com/): For creating and parsing various spreadsheet formats.
* [zod](https://zod.dev/): TypeScript-first schema validation with static type inference.

## License

This project is licensed under the MIT License.
