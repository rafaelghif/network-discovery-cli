export interface CommandResult {
  output: string;
  prompt: string;
}

export interface ITransport {
  connect(): Promise<void>;
  disconnect(): void;
  executeCommand(command: string, endPromptRegex?: RegExp): Promise<CommandResult>;
  enable(secret: string): Promise<void>;
}