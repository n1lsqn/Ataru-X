import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend Next.js
  app.enableCors();

  // Enable global DTO validation
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`GraphQL Playground is running on: http://localhost:${port}/graphql`);
}
bootstrap();
