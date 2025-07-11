import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
//import { CreateUserDto } from './dto/create-user.dto';
//import { UpdateUserDto } from './dto/update-user.dto';
import { CycleGroup, EvaluationOutput } from './typesPrisma';
import { CryptoService } from '../crypto/crypto.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}
  /*
  create(createUserDto: CreateUserDto) {
    return this.prisma.user.create({
      data: createUserDto,
    });
  }

  findAll() {
    return this.prisma.user.findMany({
      include: {
        position: true,
        manager: true,
        teamMemberships: true,
      },
    });
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  remove(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }*/

  findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        position: true,
        manager: true,
        evaluationsGiven: true,
        evaluationsReceived: true,
      },
    });
  }

  async findEvaluationsByCycle(userId: string) {
    const allCycles = await this.prisma.evaluationCycle.findMany({
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        reviewDate: true,
      },
    });

    const userScores = await this.prisma.scorePerCycle.findMany({
      where: { userId },
      select: {
        cycleId: true,
        selfScore: true,
        leaderScore: true,
        finalScore: true,
        feedback: true,
        peerScores: {
          select: {
            value: true,
          },
        },
      },
    });

    const scoreMap = new Map(userScores.map((score) => [score.cycleId, score]));

    const merged = allCycles.map((cycle) => {
      const score = scoreMap.get(cycle.id);

      if (score) {
        return {
          cycleId: cycle.id,
          name: cycle.name,
          startDate: cycle.startDate,
          reviewDate: cycle.reviewDate,
          endDate: cycle.endDate,
          selfScore: score.selfScore,
          leaderScore: score.leaderScore,
          finalScore: score.finalScore,
          feedback: score.feedback,
          peerScores: score.peerScores.map((p) => p.value),
        };
      }

      return {
        cycleId: cycle.id,
        name: cycle.name,
        startDate: cycle.startDate,
        reviewDate: cycle.reviewDate,
        endDate: cycle.endDate,
        selfScore: null,
        leaderScore: null,
        finalScore: null,
        feedback: null,
        peerScores: [],
      };
    });

    return merged;
  }

  async findEvolutionsByUserId(userId: string): Promise<CycleGroup[]> {
    const evaluations = await this.prisma.evaluation.findMany({
      where: {
        evaluatedId: userId,
        completed: true,
        type: 'AUTO',
      },
      include: {
        cycle: true,
        evaluated: {
          select: {
            id: true,
            name: true,
            position: {
              select: {
                name: true,
              },
            },
          },
        },
        answers: {
          include: {
            criterion: {
              select: {
                title: true,
                type: true,
              },
            },
          },
        },
      },
      orderBy: {
        cycle: {
          endDate: 'desc',
        },
      },
    });

    // ✅ Descriptografar campos aninhados manualmente
    for (const evalItem of evaluations) {
      if (evalItem.evaluated) {
        evalItem.evaluated = this.crypto.deepDecrypt(
          evalItem.evaluated,
          'User',
        );
      }
      evalItem.answers = evalItem.answers.map((a) =>
        this.crypto.deepDecrypt(a, 'EvaluationAnswer'),
      );
    }

    const scores = await this.prisma.scorePerCycle.findMany({
      where: {
        userId: userId,
      },
      include: {
        peerScores: {
          select: {
            value: true,
          },
        },
      },
    });

    if (!evaluations.length) {
      return [];
    }

    const groupedByCycle = evaluations.reduce(
      (acc: CycleGroup[], evaluation) => {
        let cycleGroup = acc.find(
          (group) => group.cycleId === evaluation.cycle.id,
        );

        if (!cycleGroup) {
          const score = scores.find((s) => s.cycleId === evaluation.cycle.id);

          cycleGroup = {
            cycleId: evaluation.cycle.id,
            cycleName: evaluation.cycle.name,
            startDate: evaluation.cycle.startDate,
            reviewDate: evaluation.cycle.reviewDate,
            endDate: evaluation.cycle.endDate,
            scorePerCycle: score
              ? {
                  selfScore: score.selfScore,
                  peerScores: score.peerScores.map((p) => p.value),
                  leaderScore: score.leaderScore,
                  finalScore: score.finalScore,
                  feedback: score.feedback,
                }
              : null,
            evaluations: [],
          };
          acc.push(cycleGroup);
        }

        const evaluationOutput: EvaluationOutput = {
          evaluationId: evaluation.id,
          completedAt: evaluation.createdAt,
          evaluationType: evaluation.type,
          evaluatedUser: {
            id: evaluation.evaluated.id,
            name: evaluation.evaluated.name,
            position: evaluation.evaluated.position.name,
          },
          answers: evaluation.answers.map((answer) => ({
            criterion: answer.criterion.title,
            type: answer.criterion.type,
            score: answer.score,
            justification: answer.justification,
          })),
        };

        cycleGroup.evaluations.push(evaluationOutput);
        return acc;
      },
      [],
    );

    return groupedByCycle;
  }

  async findAutoavaliationByUserId(userId: string) {
    const now = new Date();

    // Buscar ciclo atual
    const currentCycle = await this.prisma.evaluationCycle.findFirst({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { startDate: 'desc' }, // Garante pegar o mais recente, se houver vários
    });

    if (!currentCycle) {
      throw new Error('Nenhum ciclo atual encontrado');
    }

    // Buscar autoavaliação do ciclo atual
    const evaluations = await this.prisma.evaluation.findMany({
      where: {
        evaluatedId: userId,
        type: 'AUTO',
        completed: true,
        cycleId: currentCycle.id,
      },
      include: {
        answers: {
          include: {
            criterion: true,
          },
        },
        cycle: true,
      },
    });

    if (evaluations.length > 0) {
      for (const evalItem of evaluations) {
        evalItem.answers = evalItem.answers.map((answer) =>
          this.crypto.deepDecrypt(answer, 'EvaluationAnswer'),
        );
      }

      return evaluations;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        positionId: true,
      },
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const assignedCriteria = await this.prisma.criteriaAssignment.findMany({
      where: {
        positionId: user.positionId,
        criterion: {
          // Filtra critérios que não são FROMETL
          NOT: {
            type: 'FROMETL',
          },
        },
      },
      include: {
        criterion: true,
      },
    });

    // Estrutura para retorno alternativo
    return {
      message: 'Sem autoavaliações registradas',
      assignedCriteria: assignedCriteria.map(
        (assignment) => assignment.criterion,
      ),
    };
  }

  async findAllCurrentCycle() {
    const now = new Date();

    // Tenta buscar um ciclo aberto
    let currentCycle = await this.prisma.evaluationCycle.findFirst({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    if (!currentCycle) {
      currentCycle = await this.prisma.evaluationCycle.findFirst({
        where: {
          endDate: { lt: now },
        },
        orderBy: {
          endDate: 'desc',
        },
      });

      if (!currentCycle) {
        throw new Error('Não há ciclos disponíveis (abertos ou encerrados).');
      }
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: { not: 'anonymous' }, // Filtra o usuário anonymous
      },
      select: {
        id: true,
        name: true,
        role: true,
        managerId: true,
        mentorId: true,
        position: {
          select: {
            name: true,
          },
        },
        scorePerCycle: {
          where: {
            cycleId: currentCycle.id,
          },
          select: {
            id: true,
            selfScore: true,
            leaderScore: true,
            finalScore: true,
            feedback: true,
            peerScores: {
              select: {
                value: true,
              },
            },
          },
        },
      },
    });

    const decryptedUsers = users.map((user) => {
      const decryptedScores = user.scorePerCycle.map((score) => ({
        ...score,
        feedback: score.feedback ? this.crypto.decrypt(score.feedback) : null,
      }));

      return {
        ...user,
        scorePerCycle: decryptedScores,
      };
    });

    return {
      ciclo_atual_ou_ultimo: currentCycle,
      usuarios: decryptedUsers,
    };
  }

  async findAllSubordinates(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        teamMemberships: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const teams = user.teamMemberships.map((tm) => tm.team);

    const now = new Date();
    const recentCycles = await this.prisma.evaluationCycle.findMany({
      where: {
        OR: [
          {
            startDate: { lte: now },
            endDate: { gte: now },
          },
          {
            endDate: { lt: now },
          },
        ],
      },
      orderBy: {
        startDate: 'desc',
      },
      take: 2,
    });

    const cycleIds = recentCycles.map((cycle) => cycle.id);

    const subordinates = await this.prisma.user.findMany({
      where: {
        managerId: userId,
        id: { not: 'anonymous' }, // Filtra o usuário anonymous
        teamMemberships: {
          some: {
            teamId: { in: teams.map((team) => team.id) },
          },
        },
      },
      include: {
        position: true,
        scorePerCycle: {
          where: {
            cycleId: {
              in: cycleIds,
            },
          },
          include: {
            peerScores: {
              select: {
                value: true,
              },
            },
          },
        },
      },
    });

    const decryptedSubordinates = subordinates.map((s) => {
      const decryptedUser = this.crypto.deepDecrypt(s, 'User');

      const decryptedScorePerCycle = decryptedUser.scorePerCycle?.map(
        (score: any) => ({
          ...score,
          feedback: this.crypto.decrypt(score.feedback),
        }),
      );

      return {
        ...decryptedUser,
        scorePerCycle: decryptedScorePerCycle,
      };
    });

    return {
      ciclo_atual_ou_ultimo: recentCycles,
      usuarios: decryptedSubordinates,
    };
  }

  async findAllBrutalFacts(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        teamMemberships: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const teams = user.teamMemberships.map((tm) => tm.team);

    const subordinates = await this.prisma.user.findMany({
      where: {
        managerId: userId,
        teamMemberships: {
          some: {
            teamId: { in: teams.map((team) => team.id) },
          },
        },
      },
      include: {
        position: true,
        scorePerCycle: {
          include: {
            peerScores: {
              select: {
                value: true,
              },
            },
          },
        },
      },
    });

    const decryptedSubordinates = subordinates.map((s) => {
      const decryptedUser = this.crypto.deepDecrypt(s, 'User');

      const decryptedScorePerCycle = decryptedUser.scorePerCycle?.map(
        (score: any) => ({
          ...score,
          feedback: this.crypto.decrypt(score.feedback),
        }),
      );

      const {
        email: _email,
        password: _password,
        positionId: _positionId,
        managerId: _managerId,
        mentorId: _mentorId,
        ...filteredUser
      } = decryptedUser;

      return {
        ...filteredUser,
        scorePerCycle: decryptedScorePerCycle,
      };
    });

    const allCycleIds = [
      ...new Set(
        subordinates.flatMap((s) => s.scorePerCycle.map((spc) => spc.cycleId)),
      ),
    ];

    const allCycles = await this.prisma.evaluationCycle.findMany({
      where: {
        id: { in: allCycleIds },
      },
    });

    return {
      ciclos: allCycles,
      usuarios: decryptedSubordinates,
    };
  }

  async findUserTrack(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        position: { select: { track: true } },
      },
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    return user;
  }
}
