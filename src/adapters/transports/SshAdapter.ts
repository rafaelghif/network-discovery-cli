import { Client } from 'ssh2';
import { ITransport, CommandResult } from './ITransport.js';
import { CliOptions } from '../../adapters/cli/schemas.js';

export class SshAdapter implements ITransport {
  private client: Client;
  private connection?: Client;
  private stream?: any;
  private promptRegex = /(>|#)\s*$/;
  private isEnabled = false;

  constructor(private options: CliOptions['credentials'] & { host: string; legacySsh: boolean, timeout: number }) {
    this.client = new Client();
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const sshConfig: any = {
        host: this.options.host,
        port: 22,
        username: this.options.username,
        password: this.options.password,
        readyTimeout: this.options.timeout,
      };

      if (this.options.legacySsh) {
        sshConfig.algorithms = {
          kex: ['diffie-hellman-group1-sha1'],
          serverHostKey: ['ssh-rsa'],
          cipher: ['aes128-cbc'],
          hmac: ['hmac-sha1'],
        };
      }

      this.client
        .on('ready', () => {
          this.connection = this.client;
          this.client.shell((err, stream) => {
            if (err) return reject(err);
            this.stream = stream;

            let initialData = '';
            const initialListener = (data: Buffer) => {
              initialData += data.toString();
              if (this.promptRegex.test(initialData)) {
                this.stream.removeListener('data', initialListener);
                if (initialData.includes('#')) {
                  this.isEnabled = true;
                }
                resolve();
              }
            };
            this.stream.on('data', initialListener);
          });
        })
        .on('error', reject)
        .connect(sshConfig);
    });
  }

  disconnect(): void {
    this.client.end();
  }

  // in SshAdapter class
  async enable(secret: string): Promise<void> {
    if (this.isEnabled) return;

    const enableResult = await this.executeCommand('enable', /(Password:|#|>)\s*$/);

    if (enableResult.prompt.includes('#')) {
      this.isEnabled = true;
      return;
    }

    // FIXED: Check .prompt instead of .output
    if (enableResult.prompt.includes('Password:')) {
      if (!secret) {
        throw new Error('Device prompted for a password, but no enable secret was provided.');
      }
      const secretResult = await this.executeCommand(secret);
      if (!secretResult.prompt.includes('#')) {
        throw new Error('Failed to enter enable mode. The provided enable secret may be incorrect.');
      }
      this.isEnabled = true;
      return;
    }

    if (enableResult.prompt.includes('>')) {
      throw new Error('Failed to enter enable mode. The command was rejected by the device (check user privileges).');
    }

    throw new Error('Failed to enter enable mode. Unexpected response from device.');
  }

  // THIS METHOD SIGNATURE IS NOW CORRECTED
  executeCommand(command: string, endPromptRegex?: RegExp): Promise<CommandResult> {
    return new Promise(async (resolve, reject) => {
      if (!this.stream) return reject(new Error('Not connected'));

      if (!this.paginationDisabled) {
        await this.disablePagination();
      }

      const finalPromptRegex = endPromptRegex || this.promptRegex;
      let rawOutput = '';

      const listener = (data: Buffer) => {
        rawOutput += data.toString();
        const promptMatch = rawOutput.match(finalPromptRegex);
        if (promptMatch) {
          this.stream.removeListener('data', listener);

          const prompt = promptMatch[0].trim();
          const cleanedOutput = rawOutput
            .replace(new RegExp(`^${command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\r?\\n`), '')
            .replace(finalPromptRegex, '')
            .trim();

          resolve({ output: cleanedOutput, prompt });
        }
      };

      this.stream.on('data', listener);
      this.stream.write(`${command}\n`);
    });
  }

  private paginationDisabled = false;
  private async disablePagination(): Promise<void> {
    try {
      await this.tryCommand('terminal length 0');
      this.paginationDisabled = true;
    } catch (e) {
      try {
        await this.tryCommand('terminal datadump');
        this.paginationDisabled = true;
      } catch (e2) {
        // All fallbacks failed
      }
    }
  }

  private tryCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let output = '';
      const listener = (data: Buffer) => {
        output += data.toString();
        if (this.promptRegex.test(output) || output.includes('% Invalid input')) {
          this.stream.removeListener('data', listener);
          if (output.includes('% Invalid input')) {
            reject(new Error('Invalid command'));
          } else {
            resolve(output);
          }
        }
      };
      this.stream.on('data', listener);
      this.stream.write(`${command}\n`);
    });
  }
}