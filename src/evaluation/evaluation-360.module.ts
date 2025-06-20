import { Module } from '@nestjs/common';
import { Evaluation360Controller } from './evaluation-360.controller';
import { Evaluation360Service } from './evaluation-360.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [Evaluation360Controller],
  providers: [Evaluation360Service],
  exports: [Evaluation360Service],
})
export class Evaluation360Module {}
