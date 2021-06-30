import winston from 'winston';
const { createLogger, format, transports } = winston;

const logger = createLogger({
	level: "debug",
	defaultMeta: { service: 'user-service' },
	transports: [
		new winston.transports.File({ 
			filename: 'server.log', 
			level: 'verbose',
			format: format.combine(
				format.splat(),
				format.timestamp(),
				format.json({ space: 1 })
			),
		}),
	],
});

if (process.env.NODE_ENV !== 'production') {
	logger.add(new transports.Console({
		level: 'debug',
		format: format.combine(
			format.splat(),
			format.timestamp({
				format: "MM-DD HH:mm:ss",
			}),
			format.splat(),
			format.printf( ({ message, timestamp, level }) => `${timestamp} [${level}] : ${message}` )
		)
	}));
}

export { logger as default };