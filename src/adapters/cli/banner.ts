import chalk from 'chalk';

export function showBanner() {
  console.log(chalk.bold.cyan(`
  -----------------------------------------
  |   Cisco Network Discovery CLI (NDC)   |
  |             Version 1.0.0             |
  -----------------------------------------
  `));
}