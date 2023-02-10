const { createLogger, format, transports } = require('winston')

module.exports = createLogger({
    format: format.combine(
        format.splat(),
        format.json(),
        format.simple(),
        format.timestamp({format: "HH:mm:ss - DD-MM-YYYY"}),
        format.printf(info => `[${info.timestamp}] ${info.level} ${info.message}`)
    ),
    transports: [
        new transports.File({
            maxsize: 512000,
            maxFiles: 5,
            //filename: `${__dirname}../logs/log-api.log`,
             filename: './utils/logs.log'
        }),
        new transports.Console({
            level: 'debug',
        })
    ],
})