import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AuditInterceptor } from './audit/audit.interceptor';
import { CorrelationIdMiddleware } from './audit/middleware/correlation-id.middleware';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: 'http://localhost:5173',
  });

  // Apply correlation ID middleware globally
  app.use(new CorrelationIdMiddleware().use);

  // Apply global audit interceptor
  app.useGlobalInterceptors(app.get(AuditInterceptor));

  // Enable global validation pipes
  app.useGlobalPipes(new ValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('RocketCorp API')
    .setDescription(
      'All the routes and endpoints for RocketCorp.\n\n**Authentication:**\n1. Use the `/auth/login` endpoint to get your JWT token.\n2. Click the "Authorize" button in the Swagger UI and enter your token as:\n\n    Bearer <your_token_here>\n\n(Include the word `Bearer` and a space before your token.)',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(3000);
  console.log('Application is running on: http://localhost:3000');
}
bootstrap();
