const app = require('./app');
const config = require('./config/env');

app.listen(config.port, '0.0.0.0', () =>
  console.log(`Ankita Cyber Cafe portal running on 0.0.0.0:${config.port}`)
);

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:');
  console.error(err);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:');
  console.error(err);
});
