import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EvaluationType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateEvaluationAnswerDto {
  @ApiProperty({
    description: 'ID do critério de avaliação',
    example: 'crit1',
  })
  @IsString({ message: 'ID do critério deve ser uma string válida' })
  @IsNotEmpty({ message: 'ID do critério é obrigatório' })
  criterionId: string;

  @ApiProperty({
    description: 'Score dado para este critério (1-5)',
    example: 4,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber({}, { message: 'Score deve ser um número' })
  @Min(1, { message: 'Score mínimo é 1' })
  @Max(5, { message: 'Score máximo é 5' })
  score: number;

  @ApiProperty({
    description: 'Justificativa para o score dado',
    example: 'Demonstrou excelente trabalho em equipe durante o projeto',
    required: false,
  })
  @IsString({ message: 'Justificativa deve ser uma string' })
  @IsOptional()
  justification?: string;
}

export class CreateEvaluationDto {
  @ApiProperty({
    description: 'Tipo da avaliação',
    enum: EvaluationType,
    example: 'LIDER',
  })
  @IsEnum(EvaluationType, {
    message: 'Tipo de avaliação deve ser AUTO, LIDER ou PAR',
  })
  @IsNotEmpty({ message: 'Tipo da avaliação é obrigatório' })
  type: EvaluationType;

  @ApiProperty({
    description: 'ID do ciclo de avaliação',
    example: 'cycle1',
  })
  @IsString({ message: 'ID do ciclo deve ser uma string válida' })
  @IsNotEmpty({ message: 'ID do ciclo é obrigatório' })
  cycleId: string;

  @ApiProperty({
    description: 'ID do usuário avaliador',
    example: 'user1',
  })
  @IsString({ message: 'ID do avaliador deve ser uma string válida' })
  @IsNotEmpty({ message: 'ID do avaliador é obrigatório' })
  evaluatorId: string;

  @ApiProperty({
    description: 'ID do usuário avaliado',
    example: 'user2',
  })
  @IsString({ message: 'ID do avaliado deve ser uma string válida' })
  @IsNotEmpty({ message: 'ID do avaliado é obrigatório' })
  evaluatedId: string;

  @ApiProperty({
    description: 'Se a avaliação está completa',
    example: false,
    required: false,
  })
  @IsBoolean({ message: 'Campo completo deve ser um valor booleano' })
  @IsOptional()
  completed?: boolean;

  @ApiProperty({
    description: 'Respostas da avaliação com scores por critério',
    type: [CreateEvaluationAnswerDto],
    required: false,
  })
  @IsArray({ message: 'Respostas devem ser um array' })
  @ValidateNested({ each: true })
  @Type(() => CreateEvaluationAnswerDto)
  @IsOptional()
  answers?: CreateEvaluationAnswerDto[];
}
