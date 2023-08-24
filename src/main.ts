import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { config } from 'dotenv';
const crypto = require('crypto');

config();

const port = process.env.PORT || 3005;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors({
    "origin": "*",
    "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
    "preflightContinue": false,
    "optionsSuccessStatus": 204
  });
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);

//  (function(){const randomBytes = crypto.randomBytes(32);
//   const randomHexHash = randomBytes.toString('hex');
//   console.log(randomHexHash)})();
}
bootstrap();