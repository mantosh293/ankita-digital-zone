const app = require('./app');
const config = require('./config/env');

app.listen(config.port, () => console.log(`Ankita Cyber Cafe portal running at http://localhost:${config.port}`));
process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION:');
    console.error(err);
});

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:');
    console.error(err);
});
