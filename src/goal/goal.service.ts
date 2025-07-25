import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGoalActionDto } from './dto/create-goal-action.dto';
import { UpdateGoalActionDto } from './dto/update-goal-action.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { AutomaticNotificationsService } from '../notifications/automatic-notifications.service';
import { CryptoService } from '../crypto/crypto.service';

@Injectable()
export class GoalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly automaticNotificationsService: AutomaticNotificationsService,
    private readonly crypto: CryptoService,
  ) {}

  async createGoal(createGoalDto: CreateGoalDto, userId: string) {
    const goal = await this.prisma.goal.create({
      data: {
        ...createGoalDto,
        userId,
      },
    });
    goal.title = await this.crypto.decrypt(goal.title);
    if (goal.description) {
      goal.description = await this.crypto.decrypt(goal.description);
    }
    return goal;
  }

  async findFromUser(userId: string) {
    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userExists) {
      throw new NotFoundException('User not found');
    }

    const goals = await this.prisma.goal.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        actions: {
          select: {
            id: true,
            description: true,
            deadline: true,
            completed: true,
          },
        },
      },
    });
    return goals;
  }

  async updateGoal(id: string, updateGoalDto: UpdateGoalDto) {
    const goalExists = await this.prisma.goal.findUnique({
      where: { id },
    });

    if (!goalExists) {
      throw new NotFoundException('Goal not found');
    }

    const goal = await this.prisma.goal.update({
      where: { id },
      data: updateGoalDto,
    });

    goal.title = await this.crypto.decrypt(goal.title);
    if (goal.description) {
      goal.description = await this.crypto.decrypt(goal.description);
    }

    return goal;
  }

  async removeGoal(id: string) {
    const goalExists = await this.prisma.goal.findUnique({
      where: { id },
    });

    if (!goalExists) {
      throw new NotFoundException('Goal not found');
    }

    const goal = await this.prisma.goal.delete({
      where: { id },
    });

    return goal;
  }

  async createGoalAction(createGoalActionDto: CreateGoalActionDto, id: string) {
    const goalExists = await this.prisma.goal.findUnique({
      where: { id },
    });

    if (!goalExists) {
      throw new NotFoundException('Goal not found');
    }

    const goalAction = await this.prisma.goalAction.create({
      data: {
        description: createGoalActionDto.description,
        deadline: createGoalActionDto.deadline,
        goalId: id,
      },
    });

    // Enviar notificação sobre prazo da ação
    try {
      const daysUntilDeadline = Math.ceil(
        (new Date(createGoalActionDto.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilDeadline <= 7) {
        await this.notificationsService.createNotification({
          userId: goalExists.userId,
          type: 'GOAL_DEADLINE_APPROACHING',
          title: 'Prazo de Meta Aproximando',
          message: `A ação "${createGoalActionDto.description}" da meta "${goalExists.title}" vence em ${daysUntilDeadline} dia(s).`,
          priority: daysUntilDeadline <= 1 ? 'URGENT' : 'HIGH',
        });
      }
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
    }
    goalAction.description = await this.crypto.decrypt(goalAction.description);
    return goalAction;
  }

  async updateGoalAction(updateGoalActionDto: UpdateGoalActionDto, id: string) {
    const goalActionExists = await this.prisma.goalAction.findUnique({
      where: { id },
      include: {
        goal: true,
      },
    });

    if (!goalActionExists) {
      throw new NotFoundException('Goal action not found');
    }

    const goalAction = await this.prisma.goalAction.update({
      where: { id },
      data: {
        description: updateGoalActionDto.description,
        deadline: updateGoalActionDto.deadline,
        completed: updateGoalActionDto.completed,
      },
    });

    // Verificar se a ação foi marcada como completada
    if (updateGoalActionDto.completed && !goalActionExists.completed) {
      // Verificar se todas as ações da meta estão completadas
      const allActions = await this.prisma.goalAction.findMany({
        where: { goalId: goalActionExists.goalId },
      });

      const allCompleted = allActions.every(
        (action) => action.completed || action.id === id,
      );

      if (allCompleted) {
        try {
          // Remover chamada para notifyGoalCompleted
        } catch (error) {
          console.error(
            'Erro ao enviar notificação de meta completada:',
            error,
          );
        }
      }
    }

    goalAction.description = await this.crypto.decrypt(goalAction.description);

    return goalAction;
  }

  async removeGoalAction(id: string) {
    const goalActionExists = await this.prisma.goalAction.findUnique({
      where: { id },
    });

    if (!goalActionExists) {
      throw new NotFoundException('Goal action not found');
    }

    const goalAction = await this.prisma.goalAction.delete({
      where: { id },
    });

    return goalAction;
  }
}
