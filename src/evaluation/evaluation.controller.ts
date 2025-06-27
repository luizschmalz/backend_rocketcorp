import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { EvaluationService } from './evaluation.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';
import { AvaliarSubordinadoDto } from './dto/evaluate_subordinate.dto';
import { Evaluation } from './entities/evaluation.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('avaliações')
@Controller('avaliacao')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}
  @Post()
  @Roles('COLABORADOR', 'LIDER', 'RH', 'COMITE')
  @ApiOperation({ summary: 'Criar uma nova avaliação' })
  @ApiResponse({
    status: 201,
    description: 'Avaliação criada com sucesso',
    type: Evaluation,
  })
  @ApiResponse({
    status: 400,
    description: 'Requisição inválida - falha na validação',
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Proibido - permissões insuficientes',
  })
  @HttpCode(HttpStatus.CREATED)
  async criar(
    @Body() criarAvaliacaoDto: CreateEvaluationDto,
  ): Promise<Evaluation> {
    return await this.evaluationService.criar(criarAvaliacaoDto);
  }

  @Post('gestor/avaliar-subordinado')
  @Roles('LIDER', 'RH', 'COMITE')
  @ApiOperation({
    summary: 'Gestor avaliar subordinado',
    description:
      'Permite que um gestor avalie diretamente um subordinado, atribuindo nota do líder',
  })
  @ApiBody({
    type: AvaliarSubordinadoDto,
    description: 'Dados da avaliação do subordinado pelo gestor',
  })
  @ApiResponse({
    status: 201,
    description: 'Avaliação do gestor criada com sucesso',
    type: Evaluation,
  })
  @ApiResponse({
    status: 400,
    description:
      'Requisição inválida ou já existe avaliação para este subordinado',
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Proibido - só pode avaliar subordinados diretos',
  })
  @ApiResponse({
    status: 404,
    description: 'Subordinado não encontrado',
  })
  @HttpCode(HttpStatus.CREATED)
  async avaliarSubordinado(
    @Body() avaliacaoGestorDto: AvaliarSubordinadoDto,
    @Req() req: any,
  ): Promise<Evaluation> {
    const gestorId = req.user.userId;
    return await this.evaluationService.criarAvaliacaoGestor(
      gestorId,
      avaliacaoGestorDto,
    );
  }

  @Get()
  @Roles('LIDER', 'RH', 'COMITE')
  @ApiOperation({ summary: 'Buscar todas as avaliações' })
  @ApiResponse({
    status: 200,
    description: 'Lista de avaliações recuperada com sucesso',
    type: [Evaluation],
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Proibido - permissões insuficientes',
  })
  async buscarTodas(): Promise<Evaluation[]> {
    return await this.evaluationService.buscarTodas();
  }

  @Get('criterios/usuario/:userId')
  @Roles('COLABORADOR', 'LIDER', 'RH', 'COMITE')
  @ApiOperation({
    summary:
      'Buscar critérios de avaliação por usuário (busca a equipe automaticamente)',
  })
  @ApiParam({ name: 'userId', description: 'ID do usuário', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Critérios da equipe do usuário recuperados com sucesso',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
          },
        },
        team: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
          },
        },
        criteria: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              type: {
                type: 'string',
                enum: ['HABILIDADES', 'VALORES', 'METAS'],
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({
    status: 404,
    description: 'Usuário não encontrado ou não pertence a nenhuma equipe',
  })
  async buscarCriteriosPorUsuario(@Param('userId') userId: string) {
    return await this.evaluationService.buscarCriteriosPorUsuario(userId);
  }

  @Get('criterios/time/:teamId')
  @Roles('COLABORADOR', 'LIDER', 'RH', 'COMITE')
  @ApiOperation({ summary: 'Buscar critérios de avaliação por equipe' })
  @ApiParam({ name: 'teamId', description: 'ID da equipe', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Critérios da equipe recuperados com sucesso',
    schema: {
      type: 'object',
      properties: {
        team: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
          },
        },
        criteria: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              type: {
                type: 'string',
                enum: ['HABILIDADES', 'VALORES', 'METAS'],
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Equipe não encontrada' })
  async buscarCriteriosPorEquipe(@Param('teamId') teamId: string) {
    return await this.evaluationService.buscarCriteriosPorEquipe(teamId);
  }
  // pegar por id do usuário e fazer subconsulta por id do time
  @Get(':id')
  @Roles('COLABORADOR', 'LIDER', 'RH', 'COMITE')
  @ApiOperation({ summary: 'Buscar avaliação por ID' })
  @ApiParam({ name: 'id', description: 'ID da avaliação', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Avaliação recuperada com sucesso',
    type: Evaluation,
  })
  @ApiResponse({
    status: 400,
    description: 'Requisição inválida - UUID inválido',
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Avaliação não encontrada' })
  async buscarPorId(@Param('id') id: string): Promise<Evaluation> {
    return await this.evaluationService.buscarPorId(id);
  }

  @Patch(':id')
  @Roles('LIDER', 'RH', 'COMITE')
  @ApiOperation({ summary: 'Atualizar avaliação por ID' })
  @ApiParam({ name: 'id', description: 'ID da avaliação', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Avaliação atualizada com sucesso',
    type: Evaluation,
  })
  @ApiResponse({
    status: 400,
    description: 'Requisição inválida - falha na validação',
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Proibido - permissões insuficientes',
  })
  @ApiResponse({ status: 404, description: 'Avaliação não encontrada' })
  async atualizar(
    @Param('id') id: string,
    @Body() atualizarAvaliacaoDto: UpdateEvaluationDto,
  ): Promise<Evaluation> {
    return await this.evaluationService.atualizar(id, atualizarAvaliacaoDto);
  }

  @Delete(':id')
  @Roles('LIDER', 'RH', 'COMITE')
  @ApiOperation({ summary: 'Deletar avaliação por ID' })
  @ApiParam({ name: 'id', description: 'ID da avaliação', type: 'string' })
  @ApiResponse({ status: 204, description: 'Avaliação deletada com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Requisição inválida - UUID inválido',
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Proibido - permissões insuficientes',
  })
  @ApiResponse({ status: 404, description: 'Avaliação não encontrada' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remover(@Param('id') id: string): Promise<void> {
    return await this.evaluationService.remover(id);
  }

  @Get('criterios/autoavaliacao/:userId')
  @Roles('COLABORADOR', 'LIDER', 'RH', 'COMITE')
  @ApiOperation({
    summary: 'Buscar critérios para autoavaliação de um usuário',
    description:
      'Retorna os critérios atribuídos à equipe e posição do usuário, junto com o ciclo atual e se já existe autoavaliação',
  })
  @ApiParam({ name: 'userId', description: 'ID do usuário', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Critérios para autoavaliação recuperados com sucesso',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            position: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                track: { type: 'string' },
              },
            },
          },
        },
        team: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
          },
        },
        criteria: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              type: {
                type: 'string',
                enum: ['HABILIDADES', 'VALORES', 'METAS'],
              },
            },
          },
        },
        currentCycle: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
        existingEvaluation: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'string' },
            completed: { type: 'boolean' },
            answers: { type: 'array' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Proibido - permissões insuficientes',
  })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async buscarCriteriosParaAutoavaliacao(@Param('userId') userId: string) {
    return await this.evaluationService.buscarCriteriosParaAutoavaliacao(
      userId,
    );
  }
}
