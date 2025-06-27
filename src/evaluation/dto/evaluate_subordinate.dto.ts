import { IsString, IsNotEmpty, IsArray, ValidateNested, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateEvaluationAnswerDto } from './create-evaluation-answer.dto';

export class AvaliarSubordinadoDto {
  @ApiProperty({
    description: 'ID do subordinado a ser avaliado',
    example: 'user1'
  })
  @IsString()
  @IsNotEmpty()
  subordinadoId: string;

  @ApiProperty({
    description: 'ID do ciclo de avaliação',
    example: 'cycle2025_1'
  })
  @IsString()
  @IsNotEmpty()
  cycleId: string;

  @ApiProperty({
    description: 'Respostas da avaliação',
    type: [CreateEvaluationAnswerDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEvaluationAnswerDto)
  answers: CreateEvaluationAnswerDto[];

  @ApiProperty({
    description: 'Se a avaliação está completa',
    example: true,
    required: false
  })
  @IsBoolean()
  @IsOptional()
  completed?: boolean = true;
}
