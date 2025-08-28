import { Telnet } from 'telnet-client';
import { ITransport, CommandResult } from './ITransport.js';
import { CliOptions } from '../../adapters/cli/schemas.js';
import logger from '../../infrastructure/Logger.js';
import { consoleLogger } from '../../infrastructure/Logger.js';
import chalk from 'chalk';

export class TelnetAdapter implements ITransport {
    private connection: Telnet;
    private isEnabled = false;
    private promptRegex = /(>|#)\s*$/;
    private paginationDisabled = false;

    constructor(private options: CliOptions['credentials'] & { host: string; timeout: number; debug: boolean }) {
        this.connection = new Telnet();

        this.connection.on('error', (err: any) => {
            logger.error(`[TelnetAdapter] A socket-level error occurred: ${err}`);
        });
    }

    async connect(): Promise<void> {
        // This manual login logic is now robust and correct.
        return new Promise((resolve, reject) => {
            const connectTimeout = setTimeout(() => {
                this.connection.destroy();
                reject(new Error(`Telnet login timed out for ${this.options.host}.`));
            }, this.options.timeout);

            let buffer = '';
            const loginListener = (data: Buffer | string) => {
                const text = data.toString('binary');
                buffer += text;

                if (this.options.debug) {
                    const rawText = text.replace(/\r/g, '').replace(/\n/g, '↵');
                    consoleLogger.info(chalk.magentaBright(`[RAW TELNET DATA] <~ ${rawText}`));
                }

                if (/(User Name:|Username:|login:)\s*$/i.test(buffer)) {
                    buffer = '';
                    this.connection.send(this.options.username + '\r\n');
                    return;
                }

                if (/Password:\s*$/i.test(buffer)) {
                    buffer = '';
                    this.connection.send(this.options.password + '\r\n');
                    return;
                }

                if (this.promptRegex.test(buffer)) {
                    if (buffer.includes('#')) this.isEnabled = true;
                    clearTimeout(connectTimeout);
                    this.connection.removeListener('data', loginListener);
                    resolve();
                    return;
                }

                if (/authentication failed/i.test(buffer)) {
                    clearTimeout(connectTimeout);
                    this.connection.removeListener('data', loginListener);
                    reject(new Error('Telnet authentication failed. Please check your credentials.'));
                    return;
                }
            };

            this.connection.on('data', loginListener);

            this.connection.connect({
                host: this.options.host,
                port: 23,
                negotiationMandatory: false,
            }).catch((err: any) => {
                clearTimeout(connectTimeout);
                this.connection.removeListener('data', loginListener);
                reject(err);
            });
        });
    }

    disconnect(): void {
        this.connection.end();
    }

    async enable(secret: string): Promise<void> {
        if (this.isEnabled) return;
        const enableResult = await this.executeCommand('enable', /(Password:|#|>)\s*$/);
        if (enableResult.prompt.includes('#')) {
            this.isEnabled = true;
            return;
        }
        if (enableResult.prompt.includes('Password:')) {
            if (!secret) throw new Error('Device prompted for password, but no enable secret provided.');
            const secretResult = await this.executeCommand(secret);
            if (!secretResult.prompt.includes('#')) throw new Error('Failed to enter enable mode. Secret may be incorrect.');
            this.isEnabled = true;
            return;
        }
        if (enableResult.prompt.includes('>')) throw new Error('Failed to enter enable mode. Command rejected (check privileges).');
        throw new Error('Failed to enter enable mode. Unexpected response.');
    }

    async executeCommand(command: string, endPromptRegex?: RegExp): Promise<CommandResult> {
        if (!this.paginationDisabled) {
            await this.disablePagination();
        }

        return new Promise((resolve, reject) => {
            if (!this.connection) return reject(new Error('Not connected'));

            const finalPromptRegex = endPromptRegex || this.promptRegex;
            const morePromptRegex = /More:.*<space>/;
            let rawOutput = '';
            let silenceTimer: NodeJS.Timeout;

            const commandTimeout = setTimeout(() => {
                this.connection.removeListener('data', listener);
                reject(new Error(`Command "${command}" timed out after ${this.options.timeout}ms`));
            }, this.options.timeout);

            const listener = (data: Buffer | string) => {
                const text = data.toString('binary');
                rawOutput += text;

                clearTimeout(silenceTimer);
                silenceTimer = setTimeout(() => {
                    const hasFinalPrompt = finalPromptRegex.test(rawOutput);
                    const hasMorePrompt = morePromptRegex.test(rawOutput);
                    if (hasFinalPrompt) {
                        clearTimeout(commandTimeout);
                        this.connection.removeListener('data', listener);
                        const promptMatch = rawOutput.match(finalPromptRegex);
                        const prompt = promptMatch ? promptMatch[0].trim() : '';
                        const cleanedOutput = rawOutput.replace(new RegExp(morePromptRegex, 'g'), '').replace(finalPromptRegex, '').trim();
                        resolve({ output: cleanedOutput, prompt });
                    } else if (hasMorePrompt) {
                        this.connection.send(' ');
                    }
                }, 400);
            };

            this.connection.on('data', listener);
            this.connection.send(`${command}\r\n`);
        });
    }

    private async disablePagination(): Promise<void> {
        try { await this.tryCommand('terminal pager disable'); this.paginationDisabled = true; return; } catch (e) { }
        try { await this.tryCommand('terminal length 0'); this.paginationDisabled = true; return; } catch (e) { }
        try { await this.tryCommand('terminal datadump'); this.paginationDisabled = true; return; } catch (e) { }
        this.paginationDisabled = true;
    }

    private tryCommand(command: string): Promise<string> {
        return new Promise((resolve, reject) => {
            let tempBuffer = '';
            const timeout = setTimeout(() => {
                this.connection.removeListener('data', dataListener);
                reject(new Error(`Internal command "${command}" timed out.`));
            }, 5000);

            const dataListener = (data: Buffer | string) => {
                tempBuffer += data.toString('binary');
                if (this.promptRegex.test(tempBuffer) || tempBuffer.includes('% Invalid input')) {
                    clearTimeout(timeout);
                    this.connection.removeListener('data', dataListener);
                    if (tempBuffer.includes('% Invalid input')) reject(new Error('Invalid command'));
                    else resolve(tempBuffer);
                }
            };

            this.connection.on('data', dataListener);
            this.connection.send(`${command}\r\n`);
        });
    }
}