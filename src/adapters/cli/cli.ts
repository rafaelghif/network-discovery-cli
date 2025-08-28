import inquirer from 'inquirer';
import { z } from 'zod';
import { cliOptionsSchema, credentialsSchema, CliOptions } from './schemas.js';

async function promptAndValidate<T>(questions: any[], schema: z.ZodType<T>): Promise<T> {
  const answers = await inquirer.prompt(questions);
  const result = schema.safeParse(answers);
  if (result.success) {
    return result.data;
  } else {
    result.error.errors.forEach(err => console.error(`Error in ${err.path.join('.')}: ${err.message}`));
    // Re-prompting is complex with conditional flows, so we'll exit on validation failure here.
    process.exit(1);
  }
}

export async function getInteractiveOptions(): Promise<CliOptions> {
  const baseQuestions = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'Select connection mode:',
      choices: ['SSH', 'Telnet', 'Serial'],
    },
    {
      type: 'input',
      name: 'targets',
      message: 'Enter target IPs/hostnames (comma-separated):',
      when: (answers) => ['SSH', 'Telnet'].includes(answers.mode),
    },
    {
      type: 'input',
      name: 'comPort',
      message: 'Enter Serial COM Port (e.g., COM3 or /dev/ttyUSB0):',
      when: (answers) => answers.mode === 'Serial',
    },
    {
      type: 'number',
      name: 'baudRate',
      message: 'Enter Baud Rate:',
      default: 9600,
      when: (answers) => answers.mode === 'Serial',
    },
    {
      type: 'input',
      name: 'username',
      message: 'Enter Username:',
      when: (answers) => ['SSH', 'Telnet'].includes(answers.mode),
    },
    {
      type: 'password',
      name: 'password',
      message: 'Enter Password:',
      mask: '*',
      when: (answers) => ['SSH', 'Telnet'].includes(answers.mode),
    },
    {
      type: 'password',
      name: 'enableSecret',
      message: 'Enter Enable Secret (optional):',
      mask: '*',
    },
    {
      type: 'number',
      name: 'timeout',
      message: 'Enter connection timeout (ms):',
      default: 20000,
    },
    {
      type: 'confirm',
      name: 'legacySsh',
      message: 'Enable legacy SSH algorithms (for old devices)?',
      default: false,
      when: (answers) => answers.mode === 'SSH',
    },
    {
      type: 'confirm',
      name: 'debug',
      message: 'Enable debug mode (save raw command output)?',
      default: false,
    },
    {
      type: 'list', 
      name: 'resolveMacVendors',
      message: 'Resolve MAC address vendors?',
      choices: ['Offline (fast, recommended)', 'Online (requires internet)', 'Disabled'],
      filter: (value) => value.split(' ')[0], // Extracts 'Offline', 'Online', or 'Disabled'
    },
  ]);

  // Consolidate credentials into a nested object to match the schema
  const options = {
    mode: baseQuestions.mode,
    targets: baseQuestions.targets,
    comPort: baseQuestions.comPort,
    baudRate: baseQuestions.baudRate, // ADDED
    timeout: baseQuestions.timeout,
    legacySsh: baseQuestions.legacySsh ?? false,
    debug: baseQuestions.debug,
    resolveMacVendors: baseQuestions.resolveMacVendors,
    credentials: {
      username: baseQuestions.username,
      password: baseQuestions.password,
      enableSecret: baseQuestions.enableSecret,
    },
  };

  const validationResult = cliOptionsSchema.safeParse(options);
  if (validationResult.success) {
    return validationResult.data;
  } else {
    validationResult.error.errors.forEach(err => console.error(`Validation Error: ${err.path.join('.')} - ${err.message}`));
    process.exit(1);
  }
}

export function getNonInteractiveOptions(): CliOptions {
  try {
    const configJson = process.env.NDC_CONFIG_JSON;
    if (!configJson) throw new Error('NDC_CONFIG_JSON env var not set for non-interactive mode.');
    const config = JSON.parse(configJson);
    return cliOptionsSchema.parse(config);
  } catch (error) {
    console.error('Failed to parse non-interactive config:', error);
    process.exit(1);
  }
}