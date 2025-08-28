import { SerialPort } from 'serialport';
import { CommandResult, ITransport } from './ITransport.js';
import { consoleLogger } from '../../infrastructure/Logger.js';
import chalk from 'chalk';
import { CliOptions } from '../cli/schemas.js';

export class SerialAdapter implements ITransport {
  private port: SerialPort;
  private isEnabled = false;
  private promptRegex = /(>|#)\s*$/;
  private buffer = '';
  private options: CliOptions['credentials'] & { comPort: string; timeout: number; baudRate?: number; debug: boolean };
  private paginationDisabled = false; // ADDED: To track if we've disabled the pager

  constructor(options: CliOptions['credentials'] & { comPort: string; timeout: number; baudRate?: number; debug: boolean }) {
    this.options = options;
    this.port = new SerialPort({
      path: this.options.comPort,
      baudRate: this.options.baudRate || 9600,
      rtscts: true, // ADDED: Enable hardware flow control
      autoOpen: false,
    });
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      let wakeUpInterval: NodeJS.Timeout;

      const dataListener = (data: Buffer) => {
        if (this.options.debug) {
          consoleLogger.info(chalk.gray(`[RAW SERIAL DATA] <~ ${data.toString()}`));
        }
        this.buffer += data.toString();
      };

      const cleanup = (err?: Error) => {
        clearTimeout(connectTimeout);
        clearInterval(wakeUpInterval);
        this.port.removeListener('data', dataListener);
        if (err) {
          reject(err);
        }
      };

      const connectTimeout = setTimeout(() => {
        cleanup(new Error(`Connection timed out on ${this.options.comPort}. No prompt received.`));
      }, this.options.timeout);

      this.port.open((err) => {
        if (err) {
          clearTimeout(connectTimeout);
          reject(new Error(`Failed to open serial port ${this.options.comPort}: ${err.message}`));
          return;
        }

        this.port.on('data', dataListener);

        wakeUpInterval = setInterval(() => {
          if (this.promptRegex.test(this.buffer)) {
            if (this.buffer.includes('#')) {
              this.isEnabled = true;
            }
            cleanup();
            resolve();
          } else {
            // Use \r\n for better compatibility
            this.port.write('\r\n', (writeErr) => {
              if (writeErr) {
                cleanup(writeErr);
              }
            });
          }
        }, 1000);
      });
    });
  }


  disconnect(): void {
    if (this.port.isOpen) {
      this.port.close();
    }
  }

  async enable(secret: string): Promise<void> {
    if (this.isEnabled) return;

    // Wait for ANY of the three possible outcomes
    const enableResult = await this.executeCommand('enable', /(Password:|#|>)\s*$/);

    // Outcome 1: Success (no password needed)
    if (enableResult.prompt.includes('#')) {
      this.isEnabled = true;
      return;
    }

    // Outcome 2: Password needed (FIXED: Check .prompt instead of .output)
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

    // Outcome 3: Failure (returned to user prompt)
    if (enableResult.prompt.includes('>')) {
      throw new Error('Failed to enter enable mode. The command was rejected by the device (check user privileges).');
    }

    // Fallback for any other unexpected state
    throw new Error('Failed to enter enable mode. Unexpected response from device.');
  }

  async executeCommand(command: string, endPromptRegex?: RegExp): Promise<CommandResult> {
    if (!this.paginationDisabled) {
      await this.disablePagination();
    }

    return new Promise((resolve, reject) => {
      this.buffer = ''; // Clear buffer
      const finalPromptRegex = endPromptRegex || this.promptRegex; // Use custom or default prompt

      const timeout = setTimeout(() => {
        this.port.removeAllListeners('data');
        reject(new Error(`Command "${command}" timed out after ${this.options.timeout}ms`));
      }, this.options.timeout);

      const dataListener = (data: Buffer) => {
        const text = data.toString();
        this.buffer += text;
        const promptMatch = this.buffer.match(finalPromptRegex);
        if (promptMatch) {
          clearTimeout(timeout);
          this.port.removeListener('data', dataListener);

          const prompt = promptMatch[0].trim();
          const cleanedOutput = this.buffer.replace(finalPromptRegex, '').trim();

          resolve({ output: cleanedOutput, prompt });
        }
      };

      this.port.on('data', dataListener);
      this.port.write(`${command}\n`, (err) => {
        if (err) {
          clearTimeout(timeout);
          this.port.removeListener('data', dataListener);
          reject(err);
        }
      });
    });
  }

  private async disablePagination(): Promise<void> {
    try {
      await this.tryCommand('terminal length 0');
      this.paginationDisabled = true;
    } catch (e) {
      // If the primary command fails, we just continue and hope for the best.
      this.paginationDisabled = true; // Mark as "attempted" to prevent re-running
    }
  }

  private tryCommand(command: string): Promise<string> {
    // This is a simplified version of executeCommand for internal use
    return new Promise((resolve, reject) => {
      let tempBuffer = '';
      const timeout = setTimeout(() => {
        this.port.removeListener('data', dataListener);
        reject(new Error(`Internal command "${command}" timed out.`));
      }, 5000); // 5 second timeout for internal commands

      const dataListener = (data: Buffer) => {
        tempBuffer += data.toString();
        if (this.promptRegex.test(tempBuffer) || tempBuffer.includes('% Invalid input')) {
          clearTimeout(timeout);
          this.port.removeListener('data', dataListener);
          if (tempBuffer.includes('% Invalid input')) {
            reject(new Error('Invalid command'));
          } else {
            resolve(tempBuffer);
          }
        }
      };

      this.port.on('data', dataListener);
      this.port.write(`${command}\n`);
    });
  }
}