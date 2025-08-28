import ora from 'ora';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import { showBanner } from './adapters/cli/banner.js';
import { getInteractiveOptions, getNonInteractiveOptions } from './adapters/cli/cli.js';
import { DiscoveryService } from './application/DiscoveryService.js';
import { JsonWriter } from './adapters/writers/JsonWriter.js';
import { ExcelWriter } from './adapters/writers/ExcelWriter.js';
import logger, { consoleLogger } from './infrastructure/Logger.js';
import { eventBus } from './infrastructure/EventBus.js';
import { CliOptions } from './adapters/cli/schemas.js';

async function main() {
  // Ensure output directory exists
  const sessionLogDir = path.join('output', `session-${new Date().toISOString().replace(/:/g, '-')}`);
  if (!fs.existsSync(sessionLogDir)) {
      fs.mkdirSync(sessionLogDir, { recursive: true });
  }

  showBanner();
  
  const isNonInteractive = process.env.NDC_NON_INTERACTIVE === '1';
  const options: CliOptions = isNonInteractive
    ? getNonInteractiveOptions()
    : await getInteractiveOptions();

  const spinner = ora('Initializing...').start();
  let successCount = 0;
  let errorCount = 0;
  
  eventBus.subscribe('discovery:start', ({ total }) => {
    spinner.text = `Starting discovery for ${total} device(s)...`;
  });

  eventBus.subscribe('ui:updateStatus', ({ text }) => {
    spinner.text = text;
  });

  eventBus.subscribe('device:success', ({ target, hostname }) => {
    successCount++;
    logger.info(`Successfully processed ${target} (${hostname})`);
  });

  eventBus.subscribe('device:fail', ({ target, error }) => {
    errorCount++;
    spinner.warn(chalk.yellow(`Failed to process ${target}: ${error}`));
  });

  eventBus.subscribe('discovery:complete', () => {
    spinner.succeed(chalk.green.bold(`Discovery complete!`));
    console.log(chalk.bold('--- Summary ---'));
    console.log(chalk.green(`  ✅ Successful Devices: ${successCount}`));
    console.log(chalk.red(`  ❌ Failed Devices:     ${errorCount}`));
    console.log(chalk.cyan(`  📊 Total Neighbors Found (approx): Not tracked in this version`));
    console.log(chalk.bold(`\nOutputs saved in the 'output/' directory.`));
  });

  try {
    const discoveryService = new DiscoveryService(
      options,
      new JsonWriter(),
      new ExcelWriter()
    );
    await discoveryService.run();
  } catch (error: any) {
    spinner.fail('A critical error occurred.');
    logger.error('Unhandled exception in main:', error);
    consoleLogger.error(chalk.red(error.stack));
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  consoleLogger.error(chalk.red.bold('\n\nCRITICAL ERROR: Unhandled promise rejection.'));
  consoleLogger.error(reason as string);
  process.exit(1);
});

main();