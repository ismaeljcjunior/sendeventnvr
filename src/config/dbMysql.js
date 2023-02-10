const Sequelize = require('sequelize')
const logger = require('../utils/logger')

const sequelize = new Sequelize(process.env.DB_BASE, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    logging: false
});
sequelize.authenticate().then(() => {
    logger.info('Connection has been established successfully MYSQL.');
}).catch((error) => {
    logger.info('Unable to connect to the database MYSQL: ', error);
});

module.exports = sequelize;