import { PrismaService } from '../prisma/prisma.service';
import { CriterionType, Role, NotificationType, NotificationPriority } from '@prisma/client';
import { QuestionType } from '@prisma/client';

const prisma = new PrismaService();

async function main() {
  await prisma.position.createMany({
    data: [
      { id: 'pos1', name: 'Software Engineer', track: 'DESENVOLVIMENTO' },
      { id: 'pos2', name: 'Product Designer', track: 'DESIGN' },
      { id: 'pos3', name: 'Product Manager', track: 'FINANCEIRO' },
      { id: 'pos4', name: 'QA Engineer', track: 'DESENVOLVIMENTO' },
      { id: 'pos5', name: 'UX Researcher', track: 'DESIGN' },
      { id: 'pos6', name: 'COMITE', track: 'COMITE' },
      { id: 'pos7', name: 'RH', track: 'RH' },
    ],
  });

  const dataUser = [
    // Anonymous user for audit logs
    {
      id: 'anonymous',
      name: 'Anonymous User',
      email: 'anonymous@system.com',
      password: 'system',
      role: Role.COLABORADOR,
      positionId: 'pos1',
      managerId: null,
    },
    // Team Alpha
    {
      id: 'user3',
      name: 'Carlos Dias',
      email: 'carlos@visagio.com',
      password: '123456',
      role: Role.LIDER,
      positionId: 'pos3',
      managerId: null,
    },
    {
      id: 'user2',
      name: 'Bruno Costa',
      email: 'bruno@visagio.com',
      password: '123456',
      role: Role.COLABORADOR,
      positionId: 'pos2',
      managerId: 'user3',
    },
    {
      id: 'user1',
      name: 'Alice Silva',
      email: 'alice@visagio.com',
      password: '123456',
      role: Role.COLABORADOR,
      positionId: 'pos1',
      managerId: 'user3',
      mentorId: 'user2',
    },
    {
      id: 'user4',
      name: 'Daniela Martins',
      email: 'daniela@visagio.com',
      password: '123456',
      role: Role.COLABORADOR,
      positionId: 'pos4',
      managerId: 'user3',
    },
    {
      id: 'user5',
      name: 'Eduardo Silva',
      email: 'eduardo@visagio.com',
      password: '123456',
      role: Role.COLABORADOR,
      positionId: 'pos1',
      managerId: 'user3',
      mentorId: 'user4',
    },

    // Team Beta
    {
      id: 'user8',
      name: 'Helena Pereira',
      email: 'helena@visagio.com',
      password: '123456',
      role: Role.LIDER,
      positionId: 'pos3',
      managerId: null,
    },
    {
      id: 'user6',
      name: 'Fabiana Souza',
      email: 'fabiana@visagio.com',
      password: '123456',
      role: Role.COLABORADOR,
      positionId: 'pos1',
      managerId: 'user8',
    },
    {
      id: 'user7',
      name: 'Gabriel Rocha',
      email: 'gabriel@visagio.com',
      password: '123456',
      role: Role.COLABORADOR,
      positionId: 'pos5',
      managerId: 'user8',
      mentorId: 'user6',
    },
    {
      id: 'user9',
      name: 'Igor Lima',
      email: 'igor@visagio.com',
      password: '123456',
      role: Role.COLABORADOR,
      positionId: 'pos4',
      managerId: 'user8',
    },
    {
      id: 'user10',
      name: 'Julia Castro',
      email: 'julia@visagio.com',
      password: '123456',
      role: Role.COLABORADOR,
      positionId: 'pos2',
      managerId: 'user8',
      mentorId: 'user9',
    },
    {
      id: 'user11',
      name: 'Ylson Santos',
      email: 'ylson@visagio.com',
      password: '123456',
      role: Role.COMITE,
      positionId: 'pos6',
      managerId: null,
      mentorId: null,
    },
    {
      id: 'user12',
      name: 'Ana Laura',
      email: 'analaura@visagio.com',
      password: '123456',
      role: Role.RH,
      positionId: 'pos7',
      managerId: null,
      mentorId: null,
    },
  ];

  for (const user of dataUser) {
    await prisma.user.create({
      data: user,
    });
  }

  await prisma.team.createMany({
    data: [
      { id: 'team1', name: 'Team Alpha' },
      { id: 'team2', name: 'Team Beta' },
    ],
  });

  await prisma.teamMember.createMany({
    data: [
      { id: 'tm1', userId: 'user1', teamId: 'team1' },
      { id: 'tm2', userId: 'user2', teamId: 'team1' },
      { id: 'tm3', userId: 'user3', teamId: 'team1' },
      { id: 'tm4', userId: 'user4', teamId: 'team1' },
      { id: 'tm5', userId: 'user5', teamId: 'team1' },

      { id: 'tm6', userId: 'user6', teamId: 'team2' },
      { id: 'tm7', userId: 'user7', teamId: 'team2' },
      { id: 'tm8', userId: 'user8', teamId: 'team2' },
      { id: 'tm9', userId: 'user9', teamId: 'team2' },
      { id: 'tm10', userId: 'user10', teamId: 'team2' },
    ],
  });

  await prisma.evaluationCycle.createMany({
    data: [
      // Ciclos de 2023
      {
        id: 'cycle2023_1',
        name: '2023.1',
        startDate: new Date('2023-06-01'),
        reviewDate: new Date('2023-06-20'),
        endDate: new Date('2023-06-30'),
      },
      {
        id: 'cycle2023_2',
        name: '2023.2',
        startDate: new Date('2023-12-01'),
        reviewDate: new Date('2023-12-21'),
        endDate: new Date('2023-12-31'),
      },

      // Ciclos de 2024
      {
        id: 'cycle2024_1',
        name: '2024.1',
        startDate: new Date('2024-06-01'),
        reviewDate: new Date('2024-06-20'),
        endDate: new Date('2024-06-30'),
      },
      {
        id: 'cycle2024_2',
        name: '2024.2',
        startDate: new Date('2024-12-01'),
        reviewDate: new Date('2024-12-21'),
        endDate: new Date('2024-12-31'),
      },

      // Ciclos de 2025
      {
        id: 'cycle2025_1',
        name: '2025.1',
        startDate: new Date('2025-06-01'),
        reviewDate: new Date('2025-08-20'),
        endDate: new Date('2025-08-30'),
      },
      {
        id: 'cycle2025_2',
        name: '2025.2',
        startDate: new Date('2025-12-01'),
        reviewDate: new Date('2025-12-21'),
        endDate: new Date('2025-12-31'),
      },
    ],
  });

  await prisma.evaluationCriterion.createMany({
    data: [
      // COMPORTAMENTO
      {
        id: 'criterio1',
        title: 'Sentimento de Dono',
        description: 'Sentimento de Dono',
        type: 'COMPORTAMENTO',
      },
      {
        id: 'criterio2',
        title: 'Resiliência nas adversidades',
        description: 'Resiliência nas adversidades',
        type: 'COMPORTAMENTO',
      },
      {
        id: 'criterio3',
        title: 'Organização no Trabalho',
        description: 'Organização no Trabalho',
        type: 'COMPORTAMENTO',
      },
      {
        id: 'criterio4',
        title: 'Capacidade de aprender',
        description: 'Capacidade de aprender',
        type: 'COMPORTAMENTO',
      },
      {
        id: 'criterio5',
        title: 'Ser "team player"',
        description: 'Ser "team player"',
        type: 'COMPORTAMENTO',
      },
      // EXECUCAO
      {
        id: 'criterio6',
        title: 'Entregar com qualidade',
        description: 'Entregar com qualidade',
        type: 'EXECUCAO',
      },
      {
        id: 'criterio7',
        title: 'Atender aos prazos',
        description: 'Atender aos prazos',
        type: 'EXECUCAO',
      },
      {
        id: 'criterio8',
        title: 'Fazer mais com menos',
        description: 'Fazer mais com menos',
        type: 'EXECUCAO',
      },
      {
        id: 'criterio9',
        title: 'Pensar fora da caixa',
        description: 'Pensar fora da caixa',
        type: 'EXECUCAO',
      },
      // GESTAO
      {
        id: 'criterio10',
        title: 'Gente',
        description: 'Gente',
        type: 'GESTAO',
      },
      {
        id: 'criterio11',
        title: 'Resultados',
        description: 'Resultados',
        type: 'GESTAO',
      },
      {
        id: 'criterio12',
        title: 'Evolução da Rocket Corp',
        description: 'Evolução da Rocket Corp',
        type: 'GESTAO',
      },
      {
        id: '360_evaluation',
        title: '360',
        description: 'Critério para ser usado nas avaliações 360',
        type: 'AV360',
      },
    ],
  });

  await prisma.criteriaAssignment.createMany({
    data: [
      // Posição 1 (sem critérios de Gestão e Liderança)
      { id: 'ca1', criterionId: 'criterio1', positionId: 'pos1' },
      { id: 'ca2', criterionId: 'criterio2', positionId: 'pos1' },
      { id: 'ca3', criterionId: 'criterio3', positionId: 'pos1' },
      { id: 'ca4', criterionId: 'criterio4', positionId: 'pos1' },
      { id: 'ca5', criterionId: 'criterio5', positionId: 'pos1' },
      { id: 'ca6', criterionId: 'criterio6', positionId: 'pos1' },
      { id: 'ca7', criterionId: 'criterio7', positionId: 'pos1' },
      { id: 'ca8', criterionId: 'criterio8', positionId: 'pos1' },
      { id: 'ca9', criterionId: 'criterio9', positionId: 'pos1' },
      { id: 'ca99', criterionId: '360_evaluation', positionId: 'pos1' },

      // Posição 2 (sem critérios de Gestão e Liderança)
      { id: 'ca10', criterionId: 'criterio1', positionId: 'pos2' },
      { id: 'ca11', criterionId: 'criterio2', positionId: 'pos2' },
      { id: 'ca12', criterionId: 'criterio3', positionId: 'pos2' },
      { id: 'ca13', criterionId: 'criterio4', positionId: 'pos2' },
      { id: 'ca14', criterionId: 'criterio5', positionId: 'pos2' },
      { id: 'ca15', criterionId: 'criterio6', positionId: 'pos2' },
      { id: 'ca16', criterionId: 'criterio7', positionId: 'pos2' },
      { id: 'ca17', criterionId: 'criterio8', positionId: 'pos2' },
      { id: 'ca18', criterionId: 'criterio9', positionId: 'pos2' },
      { id: '188', criterionId: '360_evaluation', positionId: 'pos2' },

      // Posição 3 (todos os critérios)
      { id: 'ca19', criterionId: 'criterio1', positionId: 'pos3' },
      { id: 'ca20', criterionId: 'criterio2', positionId: 'pos3' },
      { id: 'ca21', criterionId: 'criterio3', positionId: 'pos3' },
      { id: 'ca22', criterionId: 'criterio4', positionId: 'pos3' },
      { id: 'ca23', criterionId: 'criterio5', positionId: 'pos3' },
      { id: 'ca24', criterionId: 'criterio6', positionId: 'pos3' },
      { id: 'ca25', criterionId: 'criterio7', positionId: 'pos3' },
      { id: 'ca26', criterionId: 'criterio8', positionId: 'pos3' },
      { id: 'ca27', criterionId: 'criterio9', positionId: 'pos3' },
      { id: 'ca28', criterionId: 'criterio10', positionId: 'pos3' },
      { id: 'ca29', criterionId: 'criterio11', positionId: 'pos3' },
      { id: 'ca30', criterionId: 'criterio12', positionId: 'pos3' },
      { id: 'ca929', criterionId: '360_evaluation', positionId: 'pos3' },

      // Posição 4 (sem critérios de Gestão e Liderança)
      { id: 'ca31', criterionId: 'criterio1', positionId: 'pos4' },
      { id: 'ca32', criterionId: 'criterio2', positionId: 'pos4' },
      { id: 'ca33', criterionId: 'criterio3', positionId: 'pos4' },
      { id: 'ca34', criterionId: 'criterio4', positionId: 'pos4' },
      { id: 'ca35', criterionId: 'criterio5', positionId: 'pos4' },
      { id: 'ca36', criterionId: 'criterio6', positionId: 'pos4' },
      { id: 'ca37', criterionId: 'criterio7', positionId: 'pos4' },
      { id: 'ca38', criterionId: 'criterio8', positionId: 'pos4' },
      { id: 'ca39', criterionId: 'criterio9', positionId: 'pos4' },
      { id: 'ca9922', criterionId: '360_evaluation', positionId: 'pos4' },

      // Posição 5 (sem critérios de Gestão e Liderança)
      { id: 'ca40', criterionId: 'criterio1', positionId: 'pos5' },
      { id: 'ca41', criterionId: 'criterio2', positionId: 'pos5' },
      { id: 'ca42', criterionId: 'criterio3', positionId: 'pos5' },
      { id: 'ca43', criterionId: 'criterio4', positionId: 'pos5' },
      { id: 'ca44', criterionId: 'criterio5', positionId: 'pos5' },
      { id: 'ca45', criterionId: 'criterio6', positionId: 'pos5' },
      { id: 'ca46', criterionId: 'criterio7', positionId: 'pos5' },
      { id: 'ca47', criterionId: 'criterio8', positionId: 'pos5' },
      { id: 'ca48', criterionId: 'criterio9', positionId: 'pos5' },
      { id: 'ca1119', criterionId: '360_evaluation', positionId: 'pos5' },
    ],
  });

  await prisma.evaluation.createMany({
    data: [
      // Líder Carlos avalia Alice
      {
        id: 'eval1',
        type: 'LIDER',
        cycleId: 'cycle2023_1',
        evaluatorId: 'user3',
        evaluatedId: 'user1',
        teamId: 'team1',
        createdAt: new Date(),
        completed: true,
      },
      // Autoavaliação Alice
      {
        id: 'eval2',
        type: 'AUTO',
        cycleId: 'cycle2023_1',
        evaluatorId: 'user1',
        evaluatedId: 'user1',
        teamId: 'team1',
        createdAt: new Date(),
        completed: true,
      },
      {
        id: 'eval22',
        type: 'AUTO',
        cycleId: 'cycle2024_1',
        evaluatorId: 'user1',
        evaluatedId: 'user1',
        teamId: 'team1',
        createdAt: new Date(),
        completed: true,
      },
      {
        id: 'eval223',
        type: 'AUTO',
        cycleId: 'cycle2024_2',
        evaluatorId: 'user1',
        evaluatedId: 'user1',
        teamId: 'team1',
        createdAt: new Date(),
        completed: true,
      },
      // Membro Bruno avalia Daniela
      {
        id: 'eval3',
        type: 'PAR',
        cycleId: 'cycle2025_1',
        evaluatorId: 'user2',
        evaluatedId: 'user4',
        teamId: 'team1',
        createdAt: new Date(),
        completed: true,
      },

      // Líder Helena avalia Fabiana (Team Beta)
      {
        id: 'eval4',
        type: 'LIDER',
        cycleId: 'cycle2025_1',
        evaluatorId: 'user8',
        evaluatedId: 'user6',
        teamId: 'team2',
        createdAt: new Date(),
        completed: true,
      },
      // Autoavaliação Fabiana
      {
        id: 'eval5',
        type: 'AUTO',
        cycleId: 'cycle2025_1',
        evaluatorId: 'user6',
        evaluatedId: 'user6',
        teamId: 'team2',
        createdAt: new Date(),
        completed: true,
      },
      // Membro Gabriel avalia Julia
      {
        id: 'eval6',
        type: 'PAR',
        cycleId: 'cycle2025_1',
        evaluatorId: 'user7',
        evaluatedId: 'user10',
        teamId: 'team2',
        createdAt: new Date(),
        completed: true,
      },
      {
        id: 'eval_bruno_auto',
        type: 'AUTO',
        cycleId: 'cycle2025_1',
        evaluatorId: 'user2',
        evaluatedId: 'user2',
        teamId: 'team1',
        createdAt: new Date(),
        completed: true,
      },
      {
        id: 'eval_carlos_auto',
        type: 'AUTO',
        cycleId: 'cycle2025_1',
        evaluatorId: 'user3',
        evaluatedId: 'user3',
        teamId: 'team1',
        createdAt: new Date(),
        completed: true,
      },
      {
        id: 'eval_daniela_auto',
        type: 'AUTO',
        cycleId: 'cycle2025_1',
        evaluatorId: 'user4',
        evaluatedId: 'user4',
        teamId: 'team1',
        createdAt: new Date(),
        completed: true,
      },
      {
        id: 'eval_gabriel_auto',
        type: 'AUTO',
        cycleId: 'cycle2025_1',
        evaluatorId: 'user7',
        evaluatedId: 'user7',
        teamId: 'team2',
        createdAt: new Date(),
        completed: true,
      },
      {
        id: 'eval_helena_auto',
        type: 'AUTO',
        cycleId: 'cycle2025_1',
        evaluatorId: 'user8',
        evaluatedId: 'user8',
        teamId: 'team2',
        createdAt: new Date(),
        completed: true,
      },
      {
        id: 'eval_julia_auto',
        type: 'AUTO',
        cycleId: 'cycle2025_1',
        evaluatorId: 'user10',
        evaluatedId: 'user10',
        teamId: 'team2',
        createdAt: new Date(),
        completed: true,
      },
    ],
  });

  const dataEvaluationAnswer = [
    // Avaliação eval1 (Carlos -> Alice)
    {
      id: 'ans111',
      evaluationId: 'eval1',
      criterionId: 'criterio1',
      score: 4,
      justification: 'Colaborou muito bem com o time.',
    },
    {
      id: 'ans21',
      evaluationId: 'eval1',
      criterionId: 'criterio2',
      score: 5,
      justification: 'Sempre proativa e com iniciativa.',
    },

    // Avaliação eval2 (Alice autoavaliação)
    {
      id: 'ans3',
      evaluationId: 'eval2',
      criterionId: 'criterio1',
      score: 3,
      justification: 'Acredito que posso melhorar a colaboração.',
    },
    {
      id: 'ans4',
      evaluationId: 'eval2',
      criterionId: 'criterio2',
      score: 4,
      justification: 'Costumo tomar iniciativa em projetos.',
    },
    // Avaliação ciclo2 (Alice autoavaliação)
    {
      id: 'a1ns1',
      evaluationId: 'eval22',
      criterionId: 'criterio1',
      score: 4,
      justification:
        'Procuro sempre agir com responsabilidade e tomar decisões como se a empresa fosse minha.',
    },
    {
      id: 'a1ns2',
      evaluationId: 'eval22',
      criterionId: 'criterio2',
      score: 3,
      justification:
        'Consigo manter a calma em momentos de pressão, mas ainda posso evoluir em situações de grande estresse.',
    },
    {
      id: 'a1ns3',
      evaluationId: 'eval22',
      criterionId: 'criterio3',
      score: 5,
      justification:
        'Tenho um bom controle sobre prazos, tarefas e priorização, o que me ajuda a manter a organização.',
    },
    {
      id: 'a1ns4',
      evaluationId: 'eval22',
      criterionId: 'criterio4',
      score: 4,
      justification:
        'Aprendo rápido com feedbacks e estou constantemente buscando novos conhecimentos.',
    },
    {
      id: 'a1ns5',
      evaluationId: 'eval22',
      criterionId: 'criterio5',
      score: 5,
      justification:
        'Gosto de trabalhar em equipe, colaborar e apoiar os colegas sempre que possível.',
    },
    {
      id: 'a1ns6',
      evaluationId: 'eval22',
      criterionId: 'criterio6',
      score: 4,
      justification:
        'Busco garantir a qualidade nas entregas, revisando e testando sempre antes de finalizar.',
    },
    {
      id: 'a1ns7',
      evaluationId: 'eval22',
      criterionId: 'criterio7',
      score: 3,
      justification:
        'Na maioria das vezes entrego no prazo, mas há situações em que ainda posso melhorar minha estimativa de tempo.',
    },
    {
      id: 'a1ns8',
      evaluationId: 'eval22',
      criterionId: 'criterio8',
      score: 2,
      justification:
        'Ainda estou desenvolvendo minha habilidade de otimizar recursos e processos para ganhar eficiência.',
    },
    {
      id: 'a1ns9',
      evaluationId: 'eval22',
      criterionId: 'criterio9',
      score: 4,
      justification:
        'Tenho facilidade em propor soluções diferentes quando necessário e gosto de pensar de forma criativa.',
    },
    // Avaliação ciclo3 (Alice autoavaliação)
    {
      id: 'anX3',
      evaluationId: 'eval223',
      criterionId: 'criterio3',
      score: 5,
      justification:
        'Tenho um bom controle sobre prazos, tarefas e priorização, o que me ajuda a manter a organização.',
    },
    {
      id: 'anX4',
      evaluationId: 'eval223',
      criterionId: 'criterio4',
      score: 4,
      justification:
        'Aprendo rápido com feedbacks e estou constantemente buscando novos conhecimentos.',
    },
    {
      id: 'anX5',
      evaluationId: 'eval223',
      criterionId: 'criterio5',
      score: 5,
      justification:
        'Gosto de trabalhar em equipe, colaborar e apoiar os colegas sempre que possível.',
    },
    {
      id: 'anX6',
      evaluationId: 'eval223',
      criterionId: 'criterio6',
      score: 4,
      justification:
        'Busco garantir a qualidade nas entregas, revisando e testando sempre antes de finalizar.',
    },
    {
      id: 'anX7',
      evaluationId: 'eval223',
      criterionId: 'criterio7',
      score: 3,
      justification:
        'Na maioria das vezes entrego no prazo, mas ainda posso melhorar minha estimativa de tempo.',
    },
    {
      id: 'anX8',
      evaluationId: 'eval223',
      criterionId: 'criterio8',
      score: 2,
      justification:
        'Ainda estou desenvolvendo minha habilidade de otimizar recursos e processos para ganhar eficiência.',
    },
    {
      id: 'anX9',
      evaluationId: 'eval223',
      criterionId: 'criterio9',
      score: 4,
      justification:
        'Tenho facilidade em propor soluções diferentes quando necessário e gosto de pensar de forma criativa.',
    },

    // Avaliação eval3 (Bruno -> Daniela)
    {
      id: 'ans5',
      evaluationId: 'eval3',
      criterionId: 'criterio1',
      score: 4,
      justification: 'Excelente trabalho em equipe.',
    },
    {
      id: 'ans6',
      evaluationId: 'eval3',
      criterionId: 'criterio3',
      score: 3,
      justification: 'Metas alcançadas parcialmente.',
    },

    // Avaliação eval4 (Helena -> Fabiana)
    {
      id: 'ans7',
      evaluationId: 'eval4',
      criterionId: 'criterio1',
      score: 5,
      justification: 'Ótima colaboração no time Beta.',
    },
    {
      id: 'ans8',
      evaluationId: 'eval4',
      criterionId: 'criterio2',
      score: 4,
      justification: 'Sempre pronta para agir.',
    },

    // Avaliação eval5 (Fabiana autoavaliação)
    {
      id: 'ans9',
      evaluationId: 'eval5',
      criterionId: 'criterio1',
      score: 4,
      justification: 'Acredito que sou colaborativa.',
    },
    {
      id: 'ans10',
      evaluationId: 'eval5',
      criterionId: 'criterio2',
      score: 5,
      justification: 'Tenho muita iniciativa.',
    },

    // Avaliação eval6 (Gabriel -> Julia)
    {
      id: 'ans11',
      evaluationId: 'eval6',
      criterionId: 'criterio1',
      score: 3,
      justification: 'Boa colaboração, pode melhorar.',
    },
    {
      id: 'ans12',
      evaluationId: 'eval6',
      criterionId: 'criterio3',
      score: 4,
      justification: 'Alcançou a maioria das metas.',
    },
    {
      id: 'ans_bruno_auto',
      evaluationId: 'eval_bruno_auto',
      criterionId: 'criterio1',
      score: 4,
      justification: 'Tenho colaborado bem com a equipe.',
    },
    {
      id: 'ans_carlos_auto',
      evaluationId: 'eval_carlos_auto',
      criterionId: 'criterio1',
      score: 5,
      justification: 'Tenho liderado com responsabilidade.',
    },
    {
      id: 'ans_daniela_auto',
      evaluationId: 'eval_daniela_auto',
      criterionId: 'criterio1',
      score: 3,
      justification: 'Ainda posso melhorar minha colaboração.',
    },
    {
      id: 'ans_gabriel_auto',
      evaluationId: 'eval_gabriel_auto',
      criterionId: 'criterio1',
      score: 4,
      justification: 'Participo ativamente dos projetos.',
    },
    {
      id: 'ans_helena_auto',
      evaluationId: 'eval_helena_auto',
      criterionId: 'criterio1',
      score: 5,
      justification: 'Tenho apoiado bastante o time.',
    },
    {
      id: 'ans_julia_auto',
      evaluationId: 'eval_julia_auto',
      criterionId: 'criterio1',
      score: 4,
      justification: 'Tenho me comunicado bem com os colegas.',
    },
  ];

  for (const answer of dataEvaluationAnswer) {
    await prisma.evaluationAnswer.create({
      data: answer,
    });
  }

  const references = [
    {
      id: 'ref2',
      cycleId: 'cycle2024_1',
      evaluatorId: 'user6',
      referencedId: 'user7',
      theme: 'Design inovador',
      justification: 'Gabriel trouxe ótimas ideias para UX',
    },
    {
      id: 'ref3',
      cycleId: 'cycle2024_1',
      evaluatorId: 'user3',
      referencedId: 'user5',
      theme: 'Entregas pontuais',
      justification: 'Eduardo sempre entrega no prazo',
    },
  ];

  for (const ref of references) {
    await prisma.reference.create({
      data: ref,
    });
  }

  await prisma.genaiInsight.createMany({
    data: [
      {
        id: 'insight1',
        cycleId: 'cycle2023_1',
        evaluatedId: 'user1',
        summary: 'Alice colaborou bem',
        discrepancies: 'Nenhuma',
        brutalFacts: 'Precisa melhorar entregas',
      },
      {
        id: 'insight2',
        cycleId: 'cycle2023_1',
        evaluatedId: 'user6',
        summary: 'Fabiana é muito engajada',
        discrepancies: 'Pequenas divergências em prazos',
        brutalFacts: 'Excelente comunicação',
      },
    ],
  });

  await prisma.mentorshipEvaluation.createMany({
    data: [
      {
        id: 'eval2',
        mentorId: 'user4',
        menteeId: 'user5',
        cycleId: 'cycle2023_1',
        score: 7.5,
        feedback:
          'Eduardo está evoluindo bem, mas pode melhorar na comunicação.',
      },
      {
        id: 'eval3',
        mentorId: 'user6',
        menteeId: 'user7',
        cycleId: 'cycle2023_1',
        score: 9.0,
        feedback: 'Gabriel tem excelente iniciativa.',
      },
      {
        id: 'eval4',
        mentorId: 'user9',
        menteeId: 'user10',
        cycleId: 'cycle2023_1',
        score: 8.5,
        feedback: 'Julia é muito comprometida com as entregas.',
      },
    ],
  });

  const dataScore = [
    {
      id: 'scr1',
      userId: 'user1',
      cycleId: 'cycle2025_1',
      selfScore: 0,
      leaderScore: null,
      peerScore: [4.2, 4.4, 4.3],
      finalScore: null,
      feedback: 'Bom desempenho, pode melhorar alguns pontos.',
    },
    {
      id: 'scr1234564',
      userId: 'user1',
      cycleId: 'cycle2024_2',
      selfScore: 3,
      leaderScore: 3.8,
      peerScore: [3.2, 3.4, 3.3],
      finalScore: 3.0,
      feedback: 'Bom desempenho, pode melhorar alguns pontos.',
    },
    {
      id: 'scr12345648',
      userId: 'user1',
      cycleId: 'cycle2023_1',
      selfScore: 3,
      leaderScore: 3.8,
      peerScore: [4.2, 2.4, 3.3],
      finalScore: 3.4,
      feedback: 'Bom desempenho, pode melhorar alguns pontos.',
    },
    {
      id: 'scr00',
      userId: 'user1',
      cycleId: 'cycle2023_2',
      selfScore: 3.5,
      leaderScore: 3.8,
      peerScore: [4.3, 4.1],
      finalScore: 4.0,
      feedback: 'Bom desempenho, pode melhorar alguns pontos.',
    },
    {
      id: 'scr09',
      userId: 'user1',
      cycleId: 'cycle2024_1',
      selfScore: 0.0,
      leaderScore: 0,
      peerScore: [4.4, 4.2],
      finalScore: 4.0,
      feedback: 'Bom desempenho, pode melhorar alguns pontos.',
    },
    {
      id: 'scr2',
      userId: 'user2',
      cycleId: 'cycle2025_1',
      selfScore: 4.0,
      leaderScore: 4.5,
      peerScore: [4.1, 4.3],
      finalScore: 3.8,
      feedback: 'Mostrou consistência ao longo do ciclo.',
    },
    {
      id: 'scr3',
      userId: 'user3',
      cycleId: 'cycle2025_1',
      selfScore: 4.5,
      leaderScore: 4.8,
      peerScore: [4.7, 4.6, 4.8],
      finalScore: 4.5,
      feedback: 'Excelente desempenho em todas as frentes.',
    },
    {
      id: 'scr4',
      userId: 'user4',
      cycleId: 'cycle2025_1',
      selfScore: 3.5,
      leaderScore: 4.0,
      peerScore: [4.0, 4.2],
      finalScore: 3.7,
      feedback: 'Boa performance com algumas áreas de atenção.',
    },
    {
      id: 'scr5',
      userId: 'user5',
      cycleId: 'cycle2025_1',
      selfScore: 4.5,
      leaderScore: 4.5,
      peerScore: [4.1, 4.3],
      finalScore: 4.3,
      feedback: 'Muito colaborativa e entregas consistentes.',
    },
    {
      id: 'scr6',
      userId: 'user6',
      cycleId: 'cycle2025_1',
      selfScore: 3.5,
      leaderScore: 3.8,
      peerScore: [3.7, 3.6],
      finalScore: 3.5,
      feedback: 'Atuação regular, precisa de mais iniciativa.',
    },
    {
      id: 'scr7',
      userId: 'user7',
      cycleId: 'cycle2025_1',
      selfScore: 3.5,
      leaderScore: 2.8,
      peerScore: [3.5, 3.9],
      finalScore: 3.5,
      feedback: 'Atuação regular, precisa de mais iniciativa.',
    },
    {
      id: 'scr8',
      userId: 'user8',
      cycleId: 'cycle2025_1',
      selfScore: 4.0,
      leaderScore: 4.2,
      peerScore: [4.1, 4.1],
      finalScore: 4.2,
      feedback: 'Ótima entrega técnica e boa comunicação.',
    },
    {
      id: 'scr9',
      userId: 'user9',
      cycleId: 'cycle2025_1',
      selfScore: 5.0,
      leaderScore: 4.8,
      peerScore: [4.7, 4.6],
      finalScore: 4.8,
      feedback: 'Excelente, destaque do time.',
    },
    {
      id: 'scr10',
      userId: 'user10',
      cycleId: 'cycle2025_1',
      selfScore: 3,
      leaderScore: 3,
      peerScore: [4.7, 4.6],
      finalScore: 4,
      feedback: 'Manteve consistência durante o ciclo.',
    },
  ];

  for (const entry of dataScore) {
    await prisma.scorePerCycle.create({
      data: {
        id: entry.id,
        userId: entry.userId,
        cycleId: entry.cycleId,
        selfScore: entry.selfScore,
        leaderScore: entry.leaderScore,
        finalScore: entry.finalScore,
        feedback: entry.feedback,
        peerScores: {
          create: entry.peerScore.map((value) => ({ value })),
        },
      },
    });
  }

  await prisma.survey.create({
    data: {
      id: 'survey2025_1',
      cycleId: 'cycle2024_1',
      title: 'Pesquisa de Clima Semestral',
      description:
        'Pesquisa rápida para avaliação do clima organizacional no 1º semestre de 2024',
      endDate: new Date('2024-07-30'),
      active: true,
    },
  });

  const questions = [
    {
      id: 'q1',
      surveyId: 'survey2025_1',
      text: 'Você se sente valorizado na empresa?',
      type: QuestionType.NUMBER,
    },
    {
      id: 'q2',
      surveyId: 'survey2025_1',
      text: 'Quais aspectos podemos melhorar?',
      type: QuestionType.TEXT,
    },
  ];

  for (const question of questions) {
    await prisma.surveyQuestion.create({ data: question });
  }

  await prisma.surveyResponse.create({
    data: {
      id: 'response1',
      surveyId: 'survey2025_1',
      userId: null,
    },
  });

  await prisma.surveyResponse.create({
    data: {
      id: 'response2',
      surveyId: 'survey2025_1',
      userId: null,
    },
  });

  await prisma.surveyResponse.create({
    data: {
      id: 'response3',
      surveyId: 'survey2025_1',
      userId: null,
    },
  });

  await prisma.surveyResponse.create({
    data: {
      id: 'response4',
      surveyId: 'survey2025_1',
      userId: null,
    },
  });

  const answers = [
    {
      responseId: 'response1',
      questionId: 'q1',
      answerScore: 4,
    },
    {
      responseId: 'response1',
      questionId: 'q2',
      answerText: 'Gostaria de mais comunicação interna.',
    },
    {
      responseId: 'response2',
      questionId: 'q1',
      answerScore: 4,
    },
    {
      responseId: 'response2',
      questionId: 'q2',
      answerText:
        'Gostaria de mais comunicação interna e uma melhor comunicação entre os membros.',
    },
    {
      responseId: 'response3',
      questionId: 'q1',
      answerScore: 3,
    },
    {
      responseId: 'response3',
      questionId: 'q2',
      answerText:
        'Não tenho sugestões específicas, mas acho que a comunicação pode melhorar.',
    },
    {
      responseId: 'response4',
      questionId: 'q1',
      answerScore: 4,
    },
    {
      responseId: 'response4',
      questionId: 'q2',
      answerText: 'Tudo ótimo',
    },
  ];

  await Promise.all(
    answers.map(async (answer) => {
      await prisma.surveyAnswer.create({ data: answer });
    }),
  );

  await prisma.goal.create({
    data: {
      id: 'goal1',
      userId: 'user1',
      type: 'PDI',
      title: 'Ser referência em React.js',
      description:
        'Tornar-me um especialista em React.js e suas melhores práticas.',
    },
  });

  await prisma.goal.create({
    data: {
      id: 'goal2',
      userId: 'user2',
      type: 'PDI',
      title: 'Aprimorar conhecimentos técnicos',
      description: 'Me especializar em tecnologias emergentes e novos avanços.',
    },
  });

  await prisma.goal.create({
    data: {
      id: 'goal3',
      userId: 'user3',
      type: 'OKR',
      title: 'Aumentar a colaboração no time',
      description: 'Tornar o ambiente do time mais colaborativo.',
    },
  });

  await prisma.goal.create({
    data: {
      id: 'goal4',
      userId: 'user4',
      type: 'PDI',
      title: 'Desenvolver habilidades de comunicação',
      description: 'Tornar minha comunicação mais eficaz e assertiva.',
    },
  });

  await prisma.goalAction.create({
    data: {
      id: 'action1',
      goalId: 'goal1',
      description: 'Participar de cursos avançados de React.js.',
      deadline: new Date('2025-07-31'),
    },
  });

  await prisma.goalAction.create({
    data: {
      id: 'action2',
      goalId: 'goal2',
      description: 'Assistir a webinars sobre novas tecnologias.',
      deadline: new Date('2025-08-15'),
    },
  });

  await prisma.goalAction.create({
    data: {
      id: 'action3',
      goalId: 'goal3',
      description: 'Organizar reuniões semanais de feedback.',
      deadline: new Date('2025-06-30'),
    },
  });

  await prisma.goalAction.create({
    data: {
      id: 'action4',
      goalId: 'goal4',
      description: 'Ler livros sobre comunicação eficaz.',
      deadline: new Date('2025-08-01'),
    },
  });

  const criteriosNewData = [
    // === Sentimento de Dono ===
    {
      id: 'ncriterio1_dev',
      title: 'Sentimento de Dono',
      type: 'COMPORTAMENTO',
      positions: ['pos1', 'pos4'], // DESENVOLVIMENTO
    },
    {
      id: 'ncriterio1_design',
      title: 'Sentimento de Dono',
      type: 'COMPORTAMENTO',
      positions: ['pos2', 'pos5'], // DESIGN
    },
    {
      id: 'ncriterio1_financeiro',
      title: 'Sentimento de Dono',
      type: 'COMPORTAMENTO',
      positions: ['pos3'], // FINANCEIRO
    },

    // === Resiliência nas adversidades ===
    {
      id: 'ncriterio2_dev',
      title: 'Resiliência nas adversidades',
      type: 'COMPORTAMENTO',
      positions: ['pos1', 'pos4'],
    },
    {
      id: 'ncriterio2_design',
      title: 'Resiliência nas adversidades',
      type: 'COMPORTAMENTO',
      positions: ['pos2', 'pos5'],
    },
    {
      id: 'ncriterio2_financeiro',
      title: 'Resiliência nas adversidades',
      type: 'COMPORTAMENTO',
      positions: ['pos3'],
    },

    // === Organização no Trabalho ===
    {
      id: 'ncriterio3_dev',
      title: 'Organização no Trabalho',
      type: 'COMPORTAMENTO',
      positions: ['pos1', 'pos4'],
    },
    {
      id: 'ncriterio3_design',
      title: 'Organização no Trabalho',
      type: 'COMPORTAMENTO',
      positions: ['pos2', 'pos5'],
    },
    {
      id: 'ncriterio3_financeiro',
      title: 'Organização no Trabalho',
      type: 'COMPORTAMENTO',
      positions: ['pos3'],
    },

    // === Capacidade de aprender ===
    {
      id: 'ncriterio4_dev',
      title: 'Capacidade de aprender',
      type: 'COMPORTAMENTO',
      positions: ['pos1', 'pos4'],
    },
    {
      id: 'ncriterio4_design',
      title: 'Capacidade de aprender',
      type: 'COMPORTAMENTO',
      positions: ['pos2', 'pos5'],
    },
    {
      id: 'ncriterio4_financeiro',
      title: 'Capacidade de aprender',
      type: 'COMPORTAMENTO',
      positions: ['pos3'],
    },

    // === Ser "team player" ===
    {
      id: 'ncriterio5_dev',
      title: 'Ser "team player"',
      type: 'COMPORTAMENTO',
      positions: ['pos1', 'pos4'],
    },
    {
      id: 'ncriterio5_design',
      title: 'Ser "team player"',
      type: 'COMPORTAMENTO',
      positions: ['pos2', 'pos5'],
    },
    {
      id: 'ncriterio5_financeiro',
      title: 'Ser "team player"',
      type: 'COMPORTAMENTO',
      positions: ['pos3'],
    },

    // === Entregar com qualidade ===
    {
      id: 'ncriterio6_dev',
      title: 'Entregar com qualidade',
      type: 'EXECUCAO',
      positions: ['pos1', 'pos4'],
    },
    {
      id: 'ncriterio6_design',
      title: 'Entregar com qualidade',
      type: 'EXECUCAO',
      positions: ['pos2', 'pos5'],
    },
    {
      id: 'ncriterio6_financeiro',
      title: 'Entregar com qualidade',
      type: 'EXECUCAO',
      positions: ['pos3'],
    },

    // === Atender aos prazos ===
    {
      id: 'ncriterio7_dev',
      title: 'Atender aos prazos',
      type: 'EXECUCAO',
      positions: ['pos1', 'pos4'],
    },
    {
      id: 'ncriterio7_design',
      title: 'Atender aos prazos',
      type: 'EXECUCAO',
      positions: ['pos2', 'pos5'],
    },
    {
      id: 'ncriterio7_financeiro',
      title: 'Atender aos prazos',
      type: 'EXECUCAO',
      positions: ['pos3'],
    },

    // === Fazer mais com menos ===
    {
      id: 'ncriterio8_dev',
      title: 'Fazer mais com menos',
      type: 'EXECUCAO',
      positions: ['pos1', 'pos4'],
    },
    {
      id: 'ncriterio8_design',
      title: 'Fazer mais com menos',
      type: 'EXECUCAO',
      positions: ['pos2', 'pos5'],
    },
    {
      id: 'ncriterio8_financeiro',
      title: 'Fazer mais com menos',
      type: 'EXECUCAO',
      positions: ['pos3'],
    },

    // === Pensar fora da caixa ===
    {
      id: 'ncriterio9_dev',
      title: 'Pensar fora da caixa',
      type: 'EXECUCAO',
      positions: ['pos1', 'pos4'],
    },
    {
      id: 'ncriterio9_design',
      title: 'Pensar fora da caixa',
      type: 'EXECUCAO',
      positions: ['pos2', 'pos5'],
    },
    {
      id: 'ncriterio9_financeiro',
      title: 'Pensar fora da caixa',
      type: 'EXECUCAO',
      positions: ['pos3'],
    },

    // === Gente ===
    {
      id: 'ncriterio10_financeiro',
      title: 'Gente',
      type: 'GESTAO',
      positions: ['pos3'],
    },

    // === Resultados ===
    {
      id: 'ncriterio11_financeiro',
      title: 'Resultados',
      type: 'GESTAO',
      positions: ['pos3'],
    },

    // === Evolução da Rocket Corp ===
    {
      id: 'ncriterio12_financeiro',
      title: 'Evolução da Rocket Corp',
      type: 'GESTAO',
      positions: ['pos3'],
    },
  ];

  for (const item of criteriosNewData) {
    const criterion = await prisma.nextCycleCriterion.create({
      data: {
        id: item.id,
        title: item.title,
        description: item.title,
        type: item.type as CriterionType,
      },
    });

    // cria os vínculos de cargo
    for (const positionId of item.positions) {
      await prisma.nextCycleCriterionPosition.create({
        data: {
          nextCycleCriterionId: criterion.id,
          positionId: positionId,
        },
      });
    }
  }

  // Criar templates de notificação
  await prisma.notificationTemplate.createMany({
    data: [
      {
        id: 'template1',
        type: NotificationType.EVALUATION_DUE,
        title: 'Avaliação Pendente',
        message: 'Você tem uma avaliação pendente para {evaluatedName} no ciclo {cycleName}. Prazo: {deadline}',
        variables: '["evaluatedName", "cycleName", "deadline"]',
        active: true,
      },
      {
        id: 'template2',
        type: NotificationType.EVALUATION_COMPLETED,
        title: 'Avaliação Concluída',
        message: 'Avaliação de {evaluatedName} foi concluída com sucesso no ciclo {cycleName}',
        variables: '["evaluatedName", "cycleName"]',
        active: true,
      },
      {
        id: 'template3',
        type: NotificationType.GOAL_DEADLINE_APPROACHING,
        title: 'Prazo de Meta Aproximando',
        message: 'A meta "{goalTitle}" vence em {daysLeft} dias. Não esqueça de finalizar!',
        variables: '["goalTitle", "daysLeft"]',
        active: true,
      },
      {
        id: 'template4',
        type: NotificationType.CYCLE_STARTED,
        title: 'Novo Ciclo de Avaliação',
        message: 'O ciclo {cycleName} foi iniciado. Acesse o sistema para realizar suas avaliações.',
        variables: '["cycleName"]',
        active: true,
      },
      {
        id: 'template5',
        type: NotificationType.SURVEY_AVAILABLE,
        title: 'Nova Pesquisa Disponível',
        message: 'Uma nova pesquisa "{surveyTitle}" está disponível. Participe e ajude-nos a melhorar!',
        variables: '["surveyTitle"]',
        active: true,
      },
    ],
  });

  // Criar configurações de notificação para ciclos
  await prisma.cycleNotificationSetting.createMany({
    data: [
      {
        id: 'setting1',
        cycleId: 'cycle2025_1',
        notificationType: NotificationType.EVALUATION_DUE,
        enabled: true,
        reminderDays: 3,
        customMessage: 'Lembre-se de finalizar suas avaliações antes do prazo!',
        scheduledTime: '09:00',
        frequency: 'DAILY',
        priority: NotificationPriority.HIGH,
      },
      {
        id: 'setting2',
        cycleId: 'cycle2025_1',
        notificationType: NotificationType.CYCLE_ENDING,
        enabled: true,
        reminderDays: 7,
        customMessage: 'O ciclo está terminando. Finalize suas pendências!',
        scheduledTime: '14:00',
        frequency: 'DAILY',
        priority: NotificationPriority.URGENT,
      },
      {
        id: 'setting3',
        cycleId: 'cycle2025_1',
        notificationType: NotificationType.SURVEY_AVAILABLE,
        enabled: true,
        reminderDays: 1,
        customMessage: 'Participe da pesquisa de clima organizacional!',
        scheduledTime: '10:00',
        frequency: 'WEEKLY',
        weekDay: 'MONDAY',
        priority: NotificationPriority.MEDIUM,
      },
    ],
  });

  // Criar notificações de exemplo
  const notifications = [
    // Notificação de avaliação pendente para Alice
    {
      id: 'notif1',
      userId: 'user3',
      type: NotificationType.EVALUATION_DUE,
      title: 'Avaliação Pendente',
      message: 'Você tem uma avaliação pendente para Alice Silva no ciclo 2025.1. Prazo: 30/08/2025',
      read: false,
      priority: NotificationPriority.HIGH,
      metadata: {
        evaluatedId: 'user1',
        evaluatedName: 'Alice Silva',
        cycleId: 'cycle2025_1',
        cycleName: '2025.1',
        deadline: '2025-08-30',
      },
    },
    // Notificação de avaliação concluída para Alice
    {
      id: 'notif2',
      userId: 'user1',
      type: NotificationType.EVALUATION_COMPLETED,
      title: 'Avaliação Concluída',
      message: 'Avaliação de Alice Silva foi concluída com sucesso no ciclo 2025.1',
      read: true,
      readAt: new Date('2025-08-15T10:30:00Z'),
      priority: NotificationPriority.MEDIUM,
      metadata: {
        evaluatorId: 'user3',
        evaluatorName: 'Carlos Dias',
        cycleId: 'cycle2025_1',
        cycleName: '2025.1',
      },
    },
    // Notificação de prazo de meta para Bruno
    {
      id: 'notif3',
      userId: 'user2',
      type: NotificationType.GOAL_DEADLINE_APPROACHING,
      title: 'Prazo de Meta Aproximando',
      message: 'A meta "Aprimorar conhecimentos técnicos" vence em 2 dias. Não esqueça de finalizar!',
      read: false,
      priority: NotificationPriority.HIGH,
      metadata: {
        goalId: 'goal2',
        goalTitle: 'Aprimorar conhecimentos técnicos',
        daysLeft: 2,
        deadline: '2025-08-15',
      },
    },
    // Notificação de ciclo iniciado para todos os usuários
    {
      id: 'notif4',
      userId: 'user1',
      type: NotificationType.CYCLE_STARTED,
      title: 'Novo Ciclo de Avaliação',
      message: 'O ciclo 2025.1 foi iniciado. Acesse o sistema para realizar suas avaliações.',
      read: false,
      priority: NotificationPriority.MEDIUM,
      metadata: {
        cycleId: 'cycle2025_1',
        cycleName: '2025.1',
        startDate: '2025-06-01',
      },
    },
    {
      id: 'notif5',
      userId: 'user2',
      type: NotificationType.CYCLE_STARTED,
      title: 'Novo Ciclo de Avaliação',
      message: 'O ciclo 2025.1 foi iniciado. Acesse o sistema para realizar suas avaliações.',
      read: false,
      priority: NotificationPriority.MEDIUM,
      metadata: {
        cycleId: 'cycle2025_1',
        cycleName: '2025.1',
        startDate: '2025-06-01',
      },
    },
    // Notificação de pesquisa disponível
    {
      id: 'notif6',
      userId: 'user1',
      type: NotificationType.SURVEY_AVAILABLE,
      title: 'Nova Pesquisa Disponível',
      message: 'Uma nova pesquisa "Pesquisa de Clima Semestral" está disponível. Participe e ajude-nos a melhorar!',
      read: false,
      priority: NotificationPriority.MEDIUM,
      metadata: {
        surveyId: 'survey2025_1',
        surveyTitle: 'Pesquisa de Clima Semestral',
        endDate: '2025-07-30',
      },
    },
    // Notificação de avaliação recebida
    {
      id: 'notif7',
      userId: 'user4',
      type: NotificationType.EVALUATION_RECEIVED,
      title: 'Nova Avaliação Recebida',
      message: 'Você recebeu uma nova avaliação de Bruno Costa no ciclo 2025.1',
      read: false,
      priority: NotificationPriority.MEDIUM,
      metadata: {
        evaluatorId: 'user2',
        evaluatorName: 'Bruno Costa',
        cycleId: 'cycle2025_1',
        cycleName: '2025.1',
      },
    },
    // Notificação de score disponível
    {
      id: 'notif8',
      userId: 'user1',
      type: NotificationType.SCORE_AVAILABLE,
      title: 'Score Disponível',
      message: 'Seu score do ciclo 2025.1 está disponível. Acesse para visualizar seu desempenho.',
      read: false,
      priority: NotificationPriority.HIGH,
      metadata: {
        cycleId: 'cycle2025_1',
        cycleName: '2025.1',
        finalScore: 4.0,
      },
    },
    // Notificação de anúncio do sistema
    {
      id: 'notif9',
      userId: 'user1',
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      title: 'Manutenção Programada',
      message: 'O sistema estará em manutenção no próximo domingo das 02:00 às 06:00. Pedimos desculpas pelo inconveniente.',
      read: false,
      priority: NotificationPriority.LOW,
      metadata: {
        maintenanceDate: '2025-08-17',
        maintenanceTime: '02:00-06:00',
      },
    },
    // Notificação de mentoria
    {
      id: 'notif10',
      userId: 'user5',
      type: NotificationType.MENTORSHIP_EVALUATION_DUE,
      title: 'Avaliação de Mentoria Pendente',
      message: 'Você tem uma avaliação de mentoria pendente com Daniela Martins. Prazo: 25/08/2025',
      read: false,
      priority: NotificationPriority.HIGH,
      metadata: {
        mentorId: 'user4',
        mentorName: 'Daniela Martins',
        cycleId: 'cycle2025_1',
        cycleName: '2025.1',
        deadline: '2025-08-25',
      },
    },
  ];

  for (const notification of notifications) {
    await prisma.notification.create({
      data: notification,
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
