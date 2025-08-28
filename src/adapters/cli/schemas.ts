import { z } from 'zod';

export const credentialsSchema = z.object({
  username: z.string().optional(), // Optional for Serial
  password: z.string().optional(), // Optional for Serial
  enableSecret: z.string().optional(),
});

export const cliOptionsSchema = z.object({
  mode: z.enum(['SSH', 'Telnet', 'Serial']),
  targets: z.string().optional(), // Host IPs, optional for Serial
  comPort: z.string().optional(), // COM port, optional for network modes
  baudRate: z.number().optional(), // ADDED: For Serial Port
  credentials: credentialsSchema,
  timeout: z.number().int().positive(),
  legacySsh: z.boolean(),
  debug: z.boolean(),
}).refine(data => data.mode === 'Serial' ? !!data.comPort : !!data.targets, {
  message: "Targets must be provided for SSH/Telnet, and a COM Port for Serial.",
  path: ["targets"],
});

export type CliOptions = z.infer<typeof cliOptionsSchema>;