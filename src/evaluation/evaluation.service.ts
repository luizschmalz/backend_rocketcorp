import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';
import { AvaliarSubordinadoDto } from './dto/evaluate_subordinate.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { Evaluation, EvaluationType } from '@prisma/client';

@Injectable()
export class EvaluationService {
  constructor(private prisma: PrismaService) {}

  async criar(criarAvaliacaoDto: CreateEvaluationDto): Promise<Evaluation> {
    try {
      // Primeiro, inferir o teamId do usuário avaliado
      const avaliadoComEquipe = await this.prisma.user.findUnique({
        where: { id: criarAvaliacaoDto.evaluatedId },
        include: {
          teamMemberships: {
            include: {
              team: true,
            },
          },
        },
      });

      if (!avaliadoComEquipe) {
        throw new BadRequestException('Usuário avaliado não encontrado');
      }

      if (
        !avaliadoComEquipe.teamMemberships ||
        avaliadoComEquipe.teamMemberships.length === 0
      ) {
        throw new BadRequestException(
          'Usuário avaliado não pertence a nenhuma equipe',
        );
      }

      const teamId = avaliadoComEquipe.teamMemberships[0].team.id;

      // Validar se todas as entidades referenciadas existem
      const [ciclo, avaliador, avaliado, equipe] = await Promise.all([
        this.prisma.evaluationCycle.findUnique({
          where: { id: criarAvaliacaoDto.cycleId },
        }),
        this.prisma.user.findUnique({
          where: { id: criarAvaliacaoDto.evaluatorId },
          include: { subordinates: true },
        }),
        this.prisma.user.findUnique({
          where: { id: criarAvaliacaoDto.evaluatedId },
        }),
        this.prisma.team.findUnique({
          where: { id: teamId },
          include: { members: true },
        }),
      ]);

      if (!ciclo) {
        throw new BadRequestException('Ciclo de avaliação não encontrado');
      }
      if (!avaliador) {
        throw new BadRequestException('Usuário avaliador não encontrado');
      }
      if (!avaliado) {
        throw new BadRequestException('Usuário avaliado não encontrado');
      }
      if (!equipe) {
        throw new BadRequestException('Equipe não encontrada');
      }

      await this.validateCycleActive(ciclo);

      await this.validateHierarchy(
        criarAvaliacaoDto.evaluatorId,
        criarAvaliacaoDto.evaluatedId,
        criarAvaliacaoDto.type,
        avaliador,
      );

      await this.validateTeamMembership(criarAvaliacaoDto.evaluatedId, equipe);

      // Para avaliações PAR, validar se avaliador e avaliado estão na mesma equipe
      if (criarAvaliacaoDto.type === 'PAR') {
        const avaliadorEquipe = await this.prisma.teamMember.findFirst({
          where: { userId: criarAvaliacaoDto.evaluatorId, teamId: teamId },
        });
        if (!avaliadorEquipe) {
          throw new BadRequestException(
            'Para avaliações PAR, avaliador e avaliado devem estar na mesma equipe',
          );
        }
      }

      // Verificar se já existe uma avaliação para esta combinação
      const avaliacaoExistente = await this.prisma.evaluation.findFirst({
        where: {
          cycleId: criarAvaliacaoDto.cycleId,
          evaluatorId: criarAvaliacaoDto.evaluatorId,
          evaluatedId: criarAvaliacaoDto.evaluatedId,
          type: criarAvaliacaoDto.type,
        },
      });
      if (avaliacaoExistente) {
        throw new BadRequestException(
          'Já existe uma avaliação para esta combinação',
        );
      }

      // Criar a avaliação e ScorePerCycle em uma transação
      const novaAvaliacao = await this.prisma.$transaction(async (prisma) => {
        // Criar a avaliação
        const avaliacao = await prisma.evaluation.create({
          data: {
            type: criarAvaliacaoDto.type,
            cycleId: criarAvaliacaoDto.cycleId,
            evaluatorId: criarAvaliacaoDto.evaluatorId,
            evaluatedId: criarAvaliacaoDto.evaluatedId,
            teamId: teamId, // Usar o teamId inferido
            completed: criarAvaliacaoDto.completed ?? false,
          },
          include: {
            cycle: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
              },
            },
            evaluator: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            evaluated: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        // Criar respostas se fornecidas
        if (criarAvaliacaoDto.answers && criarAvaliacaoDto.answers.length > 0) {
          await prisma.evaluationAnswer.createMany({
            data: criarAvaliacaoDto.answers.map((answer) => ({
              evaluationId: avaliacao.id,
              criterionId: answer.criterionId,
              score: answer.score,
              justification: answer.justification || '',
            })),
          });
        }

        // Criar ou atualizar ScorePerCycle baseado no tipo de avaliação
        await this.atualizarScorePerCycleParaAvaliacao(
          prisma,
          avaliacao.id,
          criarAvaliacaoDto.evaluatedId,
          criarAvaliacaoDto.cycleId,
          criarAvaliacaoDto.type,
          criarAvaliacaoDto.answers,
        );

        return avaliacao;
      });

      return novaAvaliacao;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Falha ao criar avaliação');
    }
  }

  async buscarTodas(): Promise<Evaluation[]> {
    try {
      return await this.prisma.evaluation.findMany({
        include: {
          cycle: {
            select: {
              id: true,
              name: true,
              startDate: true,
              endDate: true,
            },
          },
          evaluator: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          evaluated: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch {
      throw new InternalServerErrorException('Falha ao buscar avaliações');
    }
  }

  async buscarPorId(id: string): Promise<Evaluation> {
    try {
      const avaliacao = await this.prisma.evaluation.findUnique({
        where: { id },
        include: {
          cycle: {
            select: {
              id: true,
              name: true,
              startDate: true,
              endDate: true,
            },
          },
          evaluator: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          evaluated: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
            },
          },
          answers: {
            include: {
              criterion: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  type: true,
                },
              },
            },
          },
        },
      });

      if (!avaliacao) {
        throw new NotFoundException('Avaliação não encontrada');
      }

      const scorePerCycle = await this.prisma.scorePerCycle.findFirst({
        where: {
          userId: avaliacao.evaluatedId,
          cycleId: avaliacao.cycleId,
        },
      });
      return {
        ...avaliacao,
        scorePerCycle,
      } as any;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Falha ao buscar avaliação');
    }
  }

  async atualizar(
    id: string,
    atualizarAvaliacaoDto: UpdateEvaluationDto,
  ): Promise<Evaluation> {
    try {
      const avaliacaoExistente = await this.prisma.evaluation.findUnique({
        where: { id },
      });

      if (!avaliacaoExistente) {
        throw new NotFoundException('Avaliação não encontrada');
      }

      const validacoes = [];

      if (atualizarAvaliacaoDto.cycleId) {
        validacoes.push(
          this.prisma.evaluationCycle
            .findUnique({
              where: { id: atualizarAvaliacaoDto.cycleId },
            })
            .then((ciclo) => {
              if (!ciclo)
                throw new BadRequestException(
                  'Ciclo de avaliação não encontrado',
                );
            }),
        );
      }

      if (atualizarAvaliacaoDto.evaluatorId) {
        validacoes.push(
          this.prisma.user
            .findUnique({
              where: { id: atualizarAvaliacaoDto.evaluatorId },
            })
            .then((usuario) => {
              if (!usuario)
                throw new BadRequestException(
                  'Usuário avaliador não encontrado',
                );
            }),
        );
      }

      if (atualizarAvaliacaoDto.evaluatedId) {
        validacoes.push(
          this.prisma.user
            .findUnique({
              where: { id: atualizarAvaliacaoDto.evaluatedId },
            })
            .then((usuario) => {
              if (!usuario)
                throw new BadRequestException(
                  'Usuário avaliado não encontrado',
                );
            }),
        );
      }

      if (atualizarAvaliacaoDto.teamId) {
        validacoes.push(
          this.prisma.team
            .findUnique({
              where: { id: atualizarAvaliacaoDto.teamId },
            })
            .then((equipe) => {
              if (!equipe)
                throw new BadRequestException('Equipe não encontrada');
            }),
        );
      }

      await Promise.all(validacoes);

      if (atualizarAvaliacaoDto.completed === true) {
        const avaliado = await this.prisma.user.findUnique({
          where: { id: avaliacaoExistente.evaluatedId },
          select: { positionId: true },
        });

        const isComplete = await this.validateCompleteness(
          id,
          avaliacaoExistente.teamId,
          avaliado?.positionId || '',
        );

        if (!isComplete) {
          throw new BadRequestException(
            'Não é possível marcar como completa: critérios obrigatórios não foram respondidos',
          );
        }
      }

      return await this.prisma.evaluation.update({
        where: { id },
        data: {
          type: atualizarAvaliacaoDto.type,
          cycleId: atualizarAvaliacaoDto.cycleId,
          evaluatorId: atualizarAvaliacaoDto.evaluatorId,
          evaluatedId: atualizarAvaliacaoDto.evaluatedId,
          teamId: atualizarAvaliacaoDto.teamId,
          completed: atualizarAvaliacaoDto.completed,
        },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Falha ao atualizar avaliação');
    }
  }

  async remover(id: string): Promise<void> {
    try {
      const avaliacao = await this.prisma.evaluation.findUnique({
        where: { id },
        include: {
          answers: true,
        },
      });

      if (!avaliacao) {
        throw new NotFoundException('Avaliação não encontrada');
      }

      await this.prisma.$transaction(async (prisma) => {
        await prisma.evaluationAnswer.deleteMany({
          where: { evaluationId: id },
        });

        await prisma.evaluation.delete({
          where: { id },
        });
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Falha ao deletar avaliação');
    }
  }

  async buscarMembrosEquipe(userId: string) {
    try {
      const usuarioAtual = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          role: true,
        },
      });

      if (!usuarioAtual) {
        throw new NotFoundException('Usuário não encontrado');
      }

      // Buscar a equipe do usuário
      const teamMember = await this.prisma.teamMember.findFirst({
        where: { userId: userId },
        include: {
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!teamMember) {
        throw new NotFoundException('Usuário não pertence a nenhuma equipe');
      }

      // Buscar todos os membros da equipe
      const membrosEquipe = await this.prisma.teamMember.findMany({
        where: {
          teamId: teamMember.team.id,
          userId: { not: userId }, // Excluir o próprio usuário da lista
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              position: {
                select: {
                  id: true,
                  name: true,
                  track: true,
                },
              },
            },
          },
        },
        orderBy: {
          user: {
            name: 'asc',
          },
        },
      });

      // Verificar se o usuário já avaliou cada membro no ciclo atual
      const cicloAtual = await this.prisma.evaluationCycle.findFirst({
        where: {
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      });

      const membrosComStatus = await Promise.all(
        membrosEquipe.map(async (membro) => {
          let hasEvaluated = false;

          if (cicloAtual) {
            const avaliacaoExistente = await this.prisma.evaluation.findFirst({
              where: {
                evaluatorId: userId,
                evaluatedId: membro.user.id,
                cycleId: cicloAtual.id,
                teamId: teamMember.team.id,
              },
            });
            hasEvaluated = !!avaliacaoExistente;
          }

          return {
            id: membro.user.id,
            name: membro.user.name,
            email: membro.user.email,
            role: membro.user.role,
            position: membro.user.position,
            canEvaluate: true, // Pode ser customizado com regras de negócio
            hasEvaluated,
          };
        }),
      );

      return {
        currentUser: {
          id: usuarioAtual.id,
          name: usuarioAtual.name,
          role: usuarioAtual.role,
        },
        team: {
          id: teamMember.team.id,
          name: teamMember.team.name,
        },
        members: membrosComStatus,
        currentCycle: cicloAtual
          ? {
              id: cicloAtual.id,
              name: cicloAtual.name,
              startDate: cicloAtual.startDate,
              endDate: cicloAtual.endDate,
            }
          : null,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Erro ao buscar membros da equipe');
    }
  }

  async buscarCriteriosPorUsuario(userId: string) {
    try {
      // Buscar o usuário
      const usuario = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
        },
      });

      if (!usuario) {
        throw new NotFoundException('Usuário não encontrado');
      }

      // Buscar a equipe do usuário
      const teamMember = await this.prisma.teamMember.findFirst({
        where: { userId: userId },
        include: {
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!teamMember) {
        throw new NotFoundException('Usuário não pertence a nenhuma equipe');
      }

      // Buscar critérios da equipe
      const criterios = await this.prisma.criteriaAssignment.findMany({
        where: { teamId: teamMember.team.id },
        include: {
          criterion: {
            select: {
              id: true,
              title: true,
              description: true,
              type: true,
            },
          },
        },
        orderBy: {
          criterion: {
            type: 'asc',
          },
        },
      });

      return {
        user: {
          id: usuario.id,
          name: usuario.name,
        },
        team: {
          id: teamMember.team.id,
          name: teamMember.team.name,
        },
        criteria: criterios.map((item) => item.criterion),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Erro ao buscar critérios do usuário');
    }
  }

  async buscarCriteriosPorEquipe(teamId: string) {
    try {
      const equipe = await this.prisma.team.findUnique({
        where: { id: teamId },
      });

      if (!equipe) {
        throw new NotFoundException('Equipe não encontrada');
      }

      const criterios = await this.prisma.criteriaAssignment.findMany({
        where: { teamId: teamId },
        include: {
          criterion: {
            select: {
              id: true,
              title: true,
              description: true,
              type: true,
            },
          },
        },
        orderBy: {
          criterion: {
            type: 'asc',
          },
        },
      });

      return {
        team: {
          id: equipe.id,
          name: equipe.name,
        },
        criteria: criterios.map((item) => item.criterion),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Erro ao buscar critérios da equipe');
    }
  }
  private async atualizarScorePerCycleParaAvaliacao(
    prisma: any,
    evaluationId: string,
    userId: string,
    cycleId: string,
    evaluationType: any,
    answers?: any[],
  ): Promise<void> {
    try {
      // Buscar ou criar ScorePerCycle
      let scorePerCycle = await prisma.scorePerCycle.findFirst({
        where: {
          userId: userId,
          cycleId: cycleId,
        },
        include: {
          peerScores: true,
        },
      });

      if (!scorePerCycle) {
        scorePerCycle = await prisma.scorePerCycle.create({
          data: {
            userId: userId,
            cycleId: cycleId,
            selfScore: null,
            leaderScore: null,
            finalScore: null,
            feedback: 'Avaliação em andamento...',
          } as any, // Temporário para contornar problema do Prisma Client
          include: {
            peerScores: true,
          },
        });
      }

      // Calcular score médio se há respostas
      let averageScore = null;
      if (answers && answers.length > 0) {
        const totalScore = answers.reduce(
          (sum, answer) => sum + answer.score,
          0,
        );
        averageScore = totalScore / answers.length;
      }

      // Atualizar o score baseado no tipo de avaliação
      const updateData: any = {};

      switch (evaluationType) {
        case 'AUTO':
          if (averageScore !== null) {
            updateData.selfScore = averageScore;
          }
          break;

        case 'LIDER':
          if (averageScore !== null) {
            updateData.leaderScore = averageScore;
          }
          break;

        case 'PAR':
          if (averageScore !== null) {
            // Adicionar peer score
            await prisma.peerScore.create({
              data: {
                scorePerCycleId: scorePerCycle.id,
                value: averageScore,
              },
            });
          }
          break;
      }

      // Atualizar ScorePerCycle se há mudanças
      if (Object.keys(updateData).length > 0) {
        await prisma.scorePerCycle.update({
          where: { id: scorePerCycle.id },
          data: updateData,
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar ScorePerCycle:', error);
      // Não lançar erro aqui para não quebrar a criação da avaliação
      // O ScorePerCycle pode ser atualizado posteriormente
    }
  }

  private async validateCycleActive(ciclo: any): Promise<void> {
    const now = new Date();
    if (now < ciclo.startDate || now > ciclo.endDate) {
      throw new BadRequestException(
        `Avaliações só podem ser criadas dentro do período do ciclo (${ciclo.startDate.toLocaleDateString()} - ${ciclo.endDate.toLocaleDateString()})`,
      );
    }
  }

  private async validateHierarchy(
    evaluatorId: string,
    evaluatedId: string,
    type: any,
    avaliador: any,
  ): Promise<void> {
    if (type === 'AUTO') {
      if (evaluatorId !== evaluatedId) {
        throw new BadRequestException(
          'Auto-avaliação deve ter o mesmo usuário como avaliador e avaliado',
        );
      }
      return;
    }

    if (type === 'PAR') {
      if (evaluatorId === evaluatedId) {
        throw new BadRequestException(
          'Avaliação por pares não pode ser uma auto-avaliação',
        );
      }
      const isSubordinate = avaliador.subordinates?.some(
        (sub: any) => sub.id === evaluatedId,
      );
      if (isSubordinate || avaliador.managerId === evaluatedId) {
        throw new BadRequestException(
          'Avaliação por pares não deve haver relação hierárquica direta',
        );
      }
      return;
    }

    if (type === 'LIDER') {
      if (evaluatorId === evaluatedId) {
        throw new BadRequestException(
          'Avaliação de líder não pode ser uma auto-avaliação',
        );
      }

      const isSubordinate = avaliador.subordinates?.some(
        (sub: any) => sub.id === evaluatedId,
      );

      if (!isSubordinate) {
        throw new BadRequestException(
          'Líder só pode avaliar seus subordinados diretos',
        );
      }
      return;
    }
  }

  private async validateTeamMembership(
    evaluatedId: string,
    equipe: any,
  ): Promise<void> {
    const isMember = equipe.members?.some(
      (member: any) => member.userId === evaluatedId,
    );

    if (!isMember) {
      throw new BadRequestException(
        'Usuário avaliado deve ser membro da equipe especificada',
      );
    }
  }

  private async validateCompleteness(
    evaluationId: string,
    teamId: string,
    positionId: string,
  ): Promise<boolean> {
    const criteriosObrigatorios = await this.prisma.criteriaAssignment.findMany(
      {
        where: {
          teamId,
          positionId,
        },
        include: {
          criterion: true,
        },
      },
    );

    const respostasExistentes = await this.prisma.evaluationAnswer.findMany({
      where: { evaluationId },
    });

    const criteriosRespondidos = respostasExistentes.map((r) => r.criterionId);
    const criteriosObrigatoriosIds = criteriosObrigatorios.map(
      (c) => c.criterionId,
    );

    const criteriosFaltantes = criteriosObrigatoriosIds.filter(
      (id) => !criteriosRespondidos.includes(id),
    );

    return criteriosFaltantes.length === 0;
  }

  async buscarCriteriosParaAutoavaliacao(userId: string) {
    // Buscar usuário com equipe e posição
    const usuario = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        position: {
          select: {
            id: true,
            name: true,
            track: true,
          },
        },
        teamMemberships: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (!usuario.teamMemberships || usuario.teamMemberships.length === 0) {
      throw new BadRequestException('Usuário não pertence a nenhuma equipe');
    }

    const equipe = usuario.teamMemberships[0].team;
    const posicao = usuario.position;

    // Buscar critérios atribuídos à equipe e posição do usuário
    const criterios = await this.prisma.criteriaAssignment.findMany({
      where: {
        teamId: equipe.id,
        positionId: posicao.id,
      },
      include: {
        criterion: {
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
          },
        },
      },
    });

    // Buscar ciclo atual (primeiro ciclo ativo)
    const cicloAtual = await this.prisma.evaluationCycle.findFirst({
      where: {
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      orderBy: { startDate: 'desc' },
    });

    if (!cicloAtual) {
      throw new NotFoundException('Nenhum ciclo de avaliação ativo encontrado');
    }

    // Verificar se já existe autoavaliação para este usuário no ciclo atual
    const autoavaliacaoExistente = await this.prisma.evaluation.findFirst({
      where: {
        evaluatorId: userId,
        evaluatedId: userId,
        cycleId: cicloAtual.id,
        type: 'AUTO',
      },
      include: {
        answers: {
          include: {
            criterion: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    return {
      user: {
        id: usuario.id,
        name: usuario.name,
        position: posicao,
      },
      team: equipe,
      criteria: criterios.map((c) => c.criterion),
      currentCycle: {
        id: cicloAtual.id,
        name: cicloAtual.name,
        startDate: cicloAtual.startDate,
        endDate: cicloAtual.endDate,
      },
      existingEvaluation: autoavaliacaoExistente
        ? {
            id: autoavaliacaoExistente.id,
            completed: autoavaliacaoExistente.completed,
            answers: autoavaliacaoExistente.answers,
            createdAt: autoavaliacaoExistente.createdAt,
          }
        : null,
    };
  }

  async criarAvaliacaoGestor(
    gestorId: string,
    avaliacaoGestorDto: AvaliarSubordinadoDto,
  ): Promise<Evaluation> {
    // Verificar se o gestor realmente gerencia o subordinado
    const subordinado = await this.prisma.user.findUnique({
      where: { id: avaliacaoGestorDto.subordinadoId },
      include: {
        manager: true,
        teamMemberships: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!subordinado) {
      throw new NotFoundException('Subordinado não encontrado');
    }

    if (subordinado.managerId !== gestorId) {
      throw new ForbiddenException(
        'Você só pode avaliar seus subordinados diretos',
      );
    }

    // Verificar se já existe avaliação do líder para este subordinado no ciclo
    const avaliacaoExistente = await this.prisma.evaluation.findFirst({
      where: {
        evaluatorId: gestorId,
        evaluatedId: avaliacaoGestorDto.subordinadoId,
        cycleId: avaliacaoGestorDto.cycleId,
        type: 'LIDER',
      },
    });

    if (avaliacaoExistente) {
      throw new BadRequestException(
        'Já existe uma avaliação de líder para este subordinado neste ciclo',
      );
    }

    // Usar a lógica existente de criação, forçando tipo LIDER
    const criarAvaliacaoDto: CreateEvaluationDto = {
      type: 'LIDER' as EvaluationType,
      cycleId: avaliacaoGestorDto.cycleId,
      evaluatorId: gestorId,
      evaluatedId: avaliacaoGestorDto.subordinadoId,
      completed: avaliacaoGestorDto.completed ?? true,
      answers: avaliacaoGestorDto.answers,
    };

    return await this.criar(criarAvaliacaoDto);
  }
}
