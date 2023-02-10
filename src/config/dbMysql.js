const Sequelize = require('sequelize')
const logger = require('../utils/logger')

const sequelize = new Sequelize(process.env.DB_BASE_MYSQL, process.env.DB_USERNAME_MYSQL, process.env.DB_PASSWORD_MYSQL, {
    host: process.env.DB_HOST_MYSQL,
    dialect: process.env.DB_DIALECT_MYSQL,
    logging: false
});
sequelize.authenticate().then(() => {
    logger.info('Connection has been established successfully MYSQL.');
}).catch((error) => {
    logger.info('Unable to connect to the database MYSQL: ', error);
});

module.exports = sequelize;