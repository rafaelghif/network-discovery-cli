import { Telnet } from 'telnet-client';
import { ITransport, CommandResult } from './ITransport.js';
import { CliOptions } from '../../adapters/cli/schemas.js';

export class TelnetAdapter implements ITransport {
    private connection: Telnet;
    private isEnabled = false;
    private promptRegex = /(>|#)\s*$/;

    constructor(private options: CliOptions['credentials'] & { host: string; timeout: number }) {
        this.connection = new Telnet();
    }

    async connect(): Promise<void> {
        const params = {
            host: this.options.host,
            port: 23,
            username: this.options.username,
            password: this.options.password,
            negotiationMandatory: false,
            timeout: this.options.timeout,
            shellPrompt: this.promptRegex,
            loginPrompt: /(Username:|login:)\s*$/,
            passwordPrompt: /Password:\s*$/,
        };

        await this.connection.connect(params);
        const initialPrompt = await this.connection.exec('');
        if (initialPrompt.includes('#')) {
            this.isEnabled = true;
        }
    }

    disconnect(): void {
        this.connection.end();
    }

    // in TelnetAdapter class
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
    async executeCommand(command: string, endPromptRegex?: RegExp): Promise<CommandResult> {
        const finalPromptRegex = endPromptRegex || this.promptRegex;
        const rawOutput = await this.connection.exec(command, { shellPrompt: finalPromptRegex });
        const promptMatch = rawOutput.match(finalPromptRegex);
        const prompt = promptMatch ? promptMatch[0].trim() : '';
        const cleanedOutput = rawOutput.replace(finalPromptRegex, '').trim();

        return { output: cleanedOutput, prompt };
    }
}