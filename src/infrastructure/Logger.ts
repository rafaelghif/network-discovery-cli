import winston from 'winston';
import path from 'path';

const logsDir = 'output';
const sessionTimestamp = new Date().toISOString().replace(/:/g, '-');
const logFile = path.join(logsDir, `session-${sessionTimestamp}`, 'session.log');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: logFile }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

export const consoleLogger = {
    info: (message: string) => console.log(message),
    error: (message: string) => console.error(message),
};

export default logger;