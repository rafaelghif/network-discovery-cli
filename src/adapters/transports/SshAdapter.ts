import { Client } from 'ssh2';
import { ITransport, CommandResult } from './ITransport.js';
import { CliOptions } from '../../adapters/cli/schemas.js';

export class SshAdapter implements ITransport {
  private client: Client;
  private connection?: Client;
  private stream?: any;
  private promptRegex = /(>|#)\s*$/;
  private isEnabled = false;
  private paginationDisabled = false;

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
          kex: ['diffie-hellman-group-exchange-sha256',
            'diffie-hellman-group14-sha1',
            'diffie-hellman-group1-sha1',],
          serverHostKey: ['ssh-rsa'],
          cipher: [
            'aes128-ctr', 'aes192-ctr', 'aes256-ctr',
            'aes128-gcm@openssh.com', 'aes256-gcm@openssh.com',
            'aes128-cbc', '3des-cbc',
          ],
          hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1'],
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

  async executeCommand(command: string, endPromptRegex?: RegExp): Promise<CommandResult> {
    if (!this.paginationDisabled) {
      await this.disablePagination();
    }

    return new Promise((resolve, reject) => {
      if (!this.stream) return reject(new Error('Not connected'));

      const finalPromptRegex = endPromptRegex || this.promptRegex;
      const morePromptRegex = /More:.*<space>/;
      let rawOutput = '';
      let silenceTimer: NodeJS.Timeout;

      // This is the main timeout for the entire command
      const commandTimeout = setTimeout(() => {
        this.stream.removeListener('data', listener);
        reject(new Error(`Command "${command}" timed out after ${this.options.timeout}ms`));
      }, this.options.timeout);

      const listener = (data: Buffer) => {
        rawOutput += data.toString();

        // Reset the silence timer every time we get new data
        clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
          // If 400ms passes with no new data, check the buffer

          const hasFinalPrompt = finalPromptRegex.test(rawOutput);
          const hasMorePrompt = morePromptRegex.test(rawOutput);

          if (hasFinalPrompt) {
            // We're done!
            clearTimeout(commandTimeout);
            this.stream.removeListener('data', listener);

            const promptMatch = rawOutput.match(finalPromptRegex);
            const prompt = promptMatch ? promptMatch[0].trim() : '';

            // Clean all "More" prompts and the final prompt from the output
            const cleanedOutput = rawOutput
              .replace(new RegExp(morePromptRegex, 'g'), '')
              .replace(finalPromptRegex, '')
              .trim();

            resolve({ output: cleanedOutput, prompt });

          } else if (hasMorePrompt) {
            // Not done, get the next page.
            this.stream.write(' '); // Send a space to get the next page
          }
        }, 400); // 400ms silence threshold is a good balance
      };

      this.stream.on('data', listener);
      this.stream.write(`${command}\n`, (err: any) => {
        if (err) {
          clearTimeout(commandTimeout);
          clearTimeout(silenceTimer);
          this.stream.removeListener('data', listener);
          reject(err);
        }
      });
    });
  }

  private async disablePagination(): Promise<void> {
    // Try the modern Cisco Business Series command first
    try { await this.tryCommand('terminal pager disable'); this.paginationDisabled = true; return; } catch (e) { /* silent fail */ }
    // Standard IOS/NX-OS command
    try { await this.tryCommand('terminal length 0'); this.paginationDisabled = true; return; } catch (e) { /* silent fail */ }
    // Legacy SF/SG series command
    try { await this.tryCommand('terminal datadump'); this.paginationDisabled = true; return; } catch (e) { /* silent fail */ }

    this.paginationDisabled = true; // Mark as "attempted" to prevent re-running
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