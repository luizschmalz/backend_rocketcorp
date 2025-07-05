import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GenaiService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  constructor(private readonly prisma: PrismaService) {
    const apiKey = process.env.GEMINI_API_KEY || 'sua-api-key-aqui';
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async gerarResumoColaborador(cycleId: string, evaluatedId: string) {
    try {
      const ciclo = await this.prisma.evaluationCycle.findUnique({
        where: { id: cycleId },
      });

      if (!ciclo) {
        throw new NotFoundException('Ciclo de avaliação não encontrado');
      }

      const usuario = await this.prisma.user.findUnique({
        where: { id: evaluatedId },
        include: {
          position: true,
          teamMemberships: {
            include: {
              team: true,
            },
          },
        },
      });

      if (!usuario) {
        throw new NotFoundException('Colaborador não encontrado');
      }
      const resumoExistente = await this.prisma.genaiInsight.findFirst({
        where: {
          cycleId: cycleId,
          evaluatedId: evaluatedId,
        },
      });

      if (resumoExistente) {
        return resumoExistente;
      }
      const avaliacoes = await this.prisma.evaluation.findMany({
        where: {
          evaluatedId: evaluatedId,
          cycleId: cycleId,
          completed: true,
        },
        include: {
          evaluator: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
          answers: {
            include: {
              criterion: {
                select: {
                  title: true,
                  description: true,
                  type: true,
                },
              },
            },
          },
        },
      });
      const autoavaliacoes = avaliacoes.filter((av) => av.type === 'AUTO');
      const avaliacoesPares = avaliacoes.filter((av) => av.type === 'PAR');
      const avaliacoesLider = avaliacoes.filter((av) => av.type === 'LIDER');

      const scorePerCycle = await this.prisma.scorePerCycle.findUnique({
        where: {
          userId_cycleId: {
            userId: evaluatedId,
            cycleId: cycleId,
          },
        },
        include: {
          peerScores: true,
        },
      });
      const insights = await this.gerarInsightsComIA(
        usuario,
        avaliacoes,
        scorePerCycle,
        ciclo,
        autoavaliacoes,
        avaliacoesPares,
        avaliacoesLider,
      );

      const novoResumo = await this.prisma.genaiInsight.create({
        data: {
          cycleId: cycleId,
          evaluatedId: evaluatedId,
          summary: insights.summary,
          discrepancies: '', 
          brutalFacts: insights.brutalFacts,
        },
      });

      return novoResumo;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Erro ao gerar resumo do colaborador',
      );
    }
  }

  async buscarResumosPorCiclo(cycleId: string) {
    try {
      const resumos = await this.prisma.genaiInsight.findMany({
        where: { cycleId: cycleId },
        include: {
          evaluated: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              position: {
                select: {
                  name: true,
                  track: true,
                },
              },
            },
          },
          cycle: {
            select: {
              name: true,
              startDate: true,
              endDate: true,
            },
          },
        },
        orderBy: {
          evaluated: {
            name: 'asc',
          },
        },
      });

      return resumos.map((resumo) => ({
        id: resumo.id,
        evaluatedId: resumo.evaluatedId,
        evaluatedName: resumo.evaluated.name,
        evaluatedEmail: resumo.evaluated.email,
        evaluatedRole: resumo.evaluated.role,
        evaluatedPosition: resumo.evaluated.position.name,
        evaluatedTrack: resumo.evaluated.position.track,
        summary: resumo.summary,
        brutalFacts: resumo.brutalFacts,
        cycle: resumo.cycle,
      }));
    } catch (error) {
      throw new BadRequestException('Erro ao buscar resumos do ciclo');
    }
  }

  async buscarResumoColaborador(userId: string, cycleId: string) {
    try {
      const resumo = await this.prisma.genaiInsight.findFirst({
        where: {
          evaluatedId: userId,
          cycleId: cycleId,
        },
        include: {
          evaluated: {
            select: {
              name: true,
              email: true,
              role: true,
              position: {
                select: {
                  name: true,
                  track: true,
                },
              },
            },
          },
          cycle: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!resumo) {
        throw new NotFoundException(
          'Resumo não encontrado para este colaborador e ciclo',
        );
      }

      return resumo;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Erro ao buscar resumo do colaborador');
    }
  }

  async gerarResumosEmLote(cycleId: string) {
    try {
      const ciclo = await this.prisma.evaluationCycle.findUnique({
        where: { id: cycleId },
      });

      if (!ciclo) {
        throw new NotFoundException('Ciclo de avaliação não encontrado');
      }

      const usuariosAvaliados = await this.prisma.evaluation.findMany({
        where: {
          cycleId: cycleId,
          completed: true,
        },
        select: {
          evaluatedId: true,
        },
        distinct: ['evaluatedId'],
      });

      const resultados = [];
      let gerados = 0;

      for (const { evaluatedId } of usuariosAvaliados) {
        try {
          const resumo = await this.gerarResumoColaborador(
            cycleId,
            evaluatedId,
          );
          resultados.push({
            userId: evaluatedId,
            success: true,
            insightId: resumo.id,
          });
          gerados++;
        } catch (error) {
          resultados.push({
            userId: evaluatedId,
            success: false,
            error: error.message,
          });
        }
      }

      return {
        total: usuariosAvaliados.length,
        generated: gerados,
        results: resultados,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Erro ao gerar resumos em lote');
    }
  }
  private async gerarInsightsComIA(
    usuario: any,
    avaliacoes: any[],
    scorePerCycle: any,
    ciclo: any,
    autoavaliacoes: any[],
    avaliacoesPares: any[],
    avaliacoesLider: any[],
  ) {
    try {
      // Log para debug
      console.log('=== DEBUG: Iniciando geração de insights ===');
      console.log('Total de avaliações:', avaliacoes.length);
      console.log(
        'Auto:',
        autoavaliacoes.length,
        'Pares:',
        avaliacoesPares.length,
        'Líder:',
        avaliacoesLider.length,
      );
      const dadosEstruturados = this.prepararDadosParaAnalise(
        usuario,
        avaliacoes,
        scorePerCycle,
        ciclo,
        autoavaliacoes,
        avaliacoesPares,
        avaliacoesLider,
      );

      const prompt = this.criarPromptDetalhado(dadosEstruturados);

      console.log(
        'Prompt enviado para Gemini (primeiros 200 chars):',
        prompt.substring(0, 200),
      );

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log(
        'Resposta do Gemini (primeiros 200 chars):',
        text.substring(0, 200),
      );

      const insights = this.parsearRespostaGemini(text);

      return insights;
    } catch (error) {
      console.error('Erro ao gerar insights com Gemini:', error);
      return this.gerarInsightsLocal(
        usuario,
        avaliacoes,
        scorePerCycle,
        ciclo,
        autoavaliacoes,
        avaliacoesPares,
        avaliacoesLider,
      );
    }
  }
  private criarPromptParaGemini(
    usuario: any,
    avaliacoes: any[],
    scorePerCycle: any,
    ciclo: any,
    mediaScores: any,
    discrepanciasEncontradas: any[],
    autoavaliacoes: any[],
    avaliacoesPares: any[],
    avaliacoesLider: any[],
  ): string {
    const posicao = usuario.position?.name || 'N/A';
    const track = usuario.position?.track || 'N/A';
    const equipe = usuario.teamMemberships[0]?.team?.name || 'N/A';

    const analiseAutoavaliacao =
      autoavaliacoes.length > 0
        ? `Autoavaliação disponível (${autoavaliacoes.length} avaliação)`
        : 'Não há autoavaliação disponível';

    const analisePares =
      avaliacoesPares.length > 0
        ? `Avaliações de pares disponíveis (${avaliacoesPares.length} avaliações)`
        : 'Não há avaliação de pares disponível';

    const analiseLider =
      avaliacoesLider.length > 0
        ? `Avaliação do líder disponível (${avaliacoesLider.length} avaliação)`
        : 'Não há avaliação do líder disponível';

    // Preparar dados das avaliações com mais detalhes
    const avaliacoesTexto = avaliacoes
      .map((av: any) => {
        const criterios = av.answers.map((answer: any) => ({
          criterio: answer.criterion.title,
          score: answer.score,
          justificativa: answer.justification || 'Sem justificativa',
          tipo: answer.criterion.type,
        }));

        const mediaAvaliacao =
          criterios.reduce((sum: number, c: any) => sum + c.score, 0) /
          criterios.length;

        return `${av.type === 'AUTO' ? '🔍 AUTOAVALIAÇÃO' : av.type === 'LIDER' ? '👨‍💼 AVALIAÇÃO DO LÍDER' : '👥 AVALIAÇÃO DE PAR'} - ${av.evaluator.name} (${av.evaluator.role})
Média desta avaliação: ${mediaAvaliacao.toFixed(1)}/5
Detalhes por critério:
${criterios
  .map(
    (c: any) => `  • ${c.criterio} (${c.tipo}): ${c.score}/5
    Justificativa: "${c.justificativa}"`,
  )
  .join('\n')}
`;
      })
      .join('\n');

    // Preparar dados de scores
    const scoresTexto = scorePerCycle
      ? `
Scores Consolidados:
- Autoavaliação: ${scorePerCycle.selfScore || 'N/A'}/5
- Avaliação do Líder: ${scorePerCycle.leaderScore || 'N/A'}/5
- Avaliação dos Pares: ${scorePerCycle.peerScores?.map((p: any) => p.value).join(', ') || 'N/A'}/5
- Score Final: ${scorePerCycle.finalScore || 'N/A'}/5
`
      : 'Scores não disponíveis';
    return `
Você é um especialista em análise de performance e desenvolvimento de talentos. Analise os dados de avaliação do colaborador abaixo e gere insights estruturados e acionáveis.

DADOS DO COLABORADOR:
Nome: ${usuario.name}
Posição: ${posicao}
Track: ${track}
Equipe: ${equipe}
Ciclo: ${ciclo.name}

COBERTURA DE AVALIAÇÕES:
• ${analiseAutoavaliacao}
• ${analisePares}  
• ${analiseLider}

AVALIAÇÕES DETALHADAS:
${avaliacoesTexto}

${scoresTexto}

ESTATÍSTICAS CONSOLIDADAS:
- Total de avaliações: ${avaliacoes.length}
- Média geral: ${mediaScores.media}/5
- Score mínimo: ${mediaScores.min}/5
- Score máximo: ${mediaScores.max}/5
- Variação (max-min): ${mediaScores.max - mediaScores.min} pontos
- Discrepâncias identificadas: ${discrepanciasEncontradas.length}

ANÁLISE POR TIPO:
• Autoavaliações: ${autoavaliacoes.length} | Média: ${autoavaliacoes.length > 0 ? this.calcularMediaScores(autoavaliacoes).media.toFixed(1) : 'N/A'}/5
• Avaliações de Pares: ${avaliacoesPares.length} | Média: ${avaliacoesPares.length > 0 ? this.calcularMediaScores(avaliacoesPares).media.toFixed(1) : 'N/A'}/5  
• Avaliações de Líder: ${avaliacoesLider.length} | Média: ${avaliacoesLider.length > 0 ? this.calcularMediaScores(avaliacoesLider).media.toFixed(1) : 'N/A'}/5

INSTRUÇÕES PARA ANÁLISE:
Gere uma análise completa no seguinte formato JSON:

{
  "summary": "Resumo executivo da performance (3-4 parágrafos). Inclua: contexto do colaborador, performance geral, principais forças identificadas, áreas de melhoria específicas com base nos dados reais, e análise de consistência/variações entre autoavaliação, pares e líder.",
  "brutalFacts": "Pontos críticos e acionáveis baseados nos dados: 1) Principais gaps de performance, 2) Riscos para o colaborador/equipe, 3) Ações específicas recomendadas, 4) Prioridades de desenvolvimento, 5) Recomendações para alinhamento de percepções se necessário."
}

DIRETRIZES CRÍTICAS:
- Base-se EXCLUSIVAMENTE nos dados fornecidos
- Seja específico com números e exemplos reais das avaliações
- Identifique padrões nas justificativas fornecidas
- Compare scores entre tipos de avaliação no resumo quando relevante
- Para brutal facts: seja direto mas construtivo
- Sugira ações específicas e mensuráveis
- Mantenha tom profissional e respeitoso
- Se dados são insuficientes, seja transparente sobre limitações
`;
  }
  private parsearRespostaGemini(text: string) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || 'Resumo não gerado',
          brutalFacts:
            parsed.brutalFacts || 'Pontos críticos não identificados',
        };
      }

      return this.extrairInsightsDoTexto(text);
    } catch (error) {
      console.error('Erro ao parsear resposta do Gemini:', error);
      return {
        summary: text.substring(0, 500) + '...',
        brutalFacts: 'Erro ao processar pontos críticos',
      };
    }
  }

  private extrairInsightsDoTexto(text: string) {
    const sections = text.split('\n\n');
    return {
      summary: sections[0] || 'Resumo não disponível',
      brutalFacts: sections[1] || 'Pontos críticos não identificados',
    };
  }

  async testarConexaoGemini() {
    try {
      const prompt =
        "Olá! Este é um teste de conexão. Responda apenas com 'Conexão com Gemini funcionando corretamente!'";

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        message: 'Conexão com Gemini estabelecida com sucesso',
        response: text,
      };
    } catch (error) {
      console.error('Erro ao testar Gemini:', error);
      return {
        success: false,
        message: 'Erro ao conectar com Gemini',
        error: error.message,
      };
    }
  }

  private prepararDadosParaAnalise(
    usuario: any,
    avaliacoes: any[],
    scorePerCycle: any,
    ciclo: any,
    autoavaliacoes: any[],
    avaliacoesPares: any[],
    avaliacoesLider: any[],
  ) {
    // Calcular médias por tipo de avaliação
    const mediaAuto =
      autoavaliacoes.length > 0
        ? this.calcularMediaScores(autoavaliacoes)
        : null;
    const mediaPares =
      avaliacoesPares.length > 0
        ? this.calcularMediaScores(avaliacoesPares)
        : null;
    const mediaLider =
      avaliacoesLider.length > 0
        ? this.calcularMediaScores(avaliacoesLider)
        : null;

    const mediaGeral = this.calcularMediaScores(avaliacoes);
    const analiseDiscrepancias = this.analisarDiscrepanciasDetalhadas(
      mediaAuto,
      mediaPares,
      mediaLider,
      scorePerCycle,
    );

    const analisePortiporios = this.analisarCriteriosPorTipo(avaliacoes);

    const pontosFortesEFracos = this.identificarPontosFortesEFracos(avaliacoes);

    const analiseVariacao = this.analisarVariacaoEConsistencia(avaliacoes);

    return {
      usuario: {
        nome: usuario.name,
        posicao: usuario.position?.name || 'N/A',
        track: usuario.position?.track || 'N/A',
        equipe: usuario.teamMemberships[0]?.team?.name || 'N/A',
      },
      ciclo: {
        nome: ciclo.name,
        periodo: `${ciclo.startDate} - ${ciclo.endDate}`,
      },
      cobertura: {
        totalAvaliacoes: avaliacoes.length,
        autoavaliacoes: autoavaliacoes.length,
        avaliacoesPares: avaliacoesPares.length,
        avaliacoesLider: avaliacoesLider.length,
      },
      medias: {
        geral: mediaGeral,
        auto: mediaAuto,
        pares: mediaPares,
        lider: mediaLider,
      },
      discrepancias: analiseDiscrepancias,
      analisePortiporios: analisePortiporios,
      pontosFortesEFracos: pontosFortesEFracos,
      analiseVariacao: analiseVariacao,
      scorePerCycle: scorePerCycle,
      avaliacoesDetalhadas: this.formatarAvaliacoesDetalhadas(avaliacoes),
    };
  }
  private analisarDiscrepanciasDetalhadas(
    mediaAuto: any,
    mediaPares: any,
    mediaLider: any,
    scorePerCycle: any,
  ) {
    const discrepancias = [];
    const tiposDisponveis = [];

    // Identificar quais tipos de avaliação estão disponíveis
    if (mediaAuto) tiposDisponveis.push('auto');
    if (mediaPares) tiposDisponveis.push('pares');
    if (mediaLider) tiposDisponveis.push('lider');

    // Comparar autoavaliação vs pares
    if (mediaAuto && mediaPares) {
      const diferenca = Math.abs(mediaAuto.media - mediaPares.media);
      if (diferenca > 0.3) {
        // Threshold mais baixo para detectar discrepâncias sutis
        discrepancias.push({
          tipo: 'auto_vs_pares',
          diferenca: diferenca,
          autoMedia: mediaAuto.media,
          paresMedia: mediaPares.media,
          gravidade:
            diferenca > 1.5 ? 'alta' : diferenca > 0.8 ? 'media' : 'baixa',
          interpretacao:
            mediaAuto.media > mediaPares.media
              ? 'Autoavaliação superior aos pares'
              : 'Pares avaliam melhor que autoavaliação',
          contexto: this.gerarContextoDiscrepancia(
            'auto_vs_pares',
            diferenca,
            mediaAuto,
            mediaPares,
          ),
        });
      }
    }

    // Comparar autoavaliação vs líder
    if (mediaAuto && mediaLider) {
      const diferenca = Math.abs(mediaAuto.media - mediaLider.media);
      if (diferenca > 0.3) {
        discrepancias.push({
          tipo: 'auto_vs_lider',
          diferenca: diferenca,
          autoMedia: mediaAuto.media,
          liderMedia: mediaLider.media,
          gravidade:
            diferenca > 1.5 ? 'alta' : diferenca > 0.8 ? 'media' : 'baixa',
          interpretacao:
            mediaAuto.media > mediaLider.media
              ? 'Autoavaliação superior ao líder'
              : 'Líder avalia melhor que autoavaliação',
          contexto: this.gerarContextoDiscrepancia(
            'auto_vs_lider',
            diferenca,
            mediaAuto,
            mediaLider,
          ),
        });
      }
    }

    // Comparar pares vs líder
    if (mediaPares && mediaLider) {
      const diferenca = Math.abs(mediaPares.media - mediaLider.media);
      if (diferenca > 0.3) {
        discrepancias.push({
          tipo: 'pares_vs_lider',
          diferenca: diferenca,
          paresMedia: mediaPares.media,
          liderMedia: mediaLider.media,
          gravidade:
            diferenca > 1.5 ? 'alta' : diferenca > 0.8 ? 'media' : 'baixa',
          interpretacao:
            mediaPares.media > mediaLider.media
              ? 'Pares avaliam melhor que líder'
              : 'Líder avalia melhor que pares',
          contexto: this.gerarContextoDiscrepancia(
            'pares_vs_lider',
            diferenca,
            mediaPares,
            mediaLider,
          ),
        });
      }
    }

    // Analisar limitações de dados e adicionar contexto
    const limitacoesDados = this.analisarLimitacoesDados(
      tiposDisponveis,
      mediaAuto,
      mediaPares,
      mediaLider,
    );

    return {
      discrepancias,
      tiposDisponveis,
      limitacoesDados,
      cobertura: {
        total: tiposDisponveis.length,
        tem360: tiposDisponveis.length === 3,
        parcial: tiposDisponveis.length < 3,
      },
    };
  }
  private analisarCriteriosPorTipo(avaliacoes: any[]) {
    const criteriosPorTipo: any = {};

    avaliacoes.forEach((avaliacao: any) => {
      avaliacao.answers.forEach((answer: any) => {
        const criterio = answer.criterion.title;
        const tipo = answer.criterion.type;
        const tipoAvaliacao = avaliacao.type;

        if (!criteriosPorTipo[criterio]) {
          criteriosPorTipo[criterio] = {
            tipo: tipo,
            scores: [],
            porTipoAvaliacao: {},
          };
        }

        criteriosPorTipo[criterio].scores.push(answer.score);

        if (!criteriosPorTipo[criterio].porTipoAvaliacao[tipoAvaliacao]) {
          criteriosPorTipo[criterio].porTipoAvaliacao[tipoAvaliacao] = [];
        }
        criteriosPorTipo[criterio].porTipoAvaliacao[tipoAvaliacao].push(
          answer.score,
        );
      });
    });

    // Calcular médias por critério
    Object.keys(criteriosPorTipo).forEach((criterio: string) => {
      const scores = criteriosPorTipo[criterio].scores;
      criteriosPorTipo[criterio].media =
        scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
      criteriosPorTipo[criterio].min = Math.min(...scores);
      criteriosPorTipo[criterio].max = Math.max(...scores);
      criteriosPorTipo[criterio].variacao =
        criteriosPorTipo[criterio].max - criteriosPorTipo[criterio].min;

      // Médias por tipo de avaliação
      Object.keys(criteriosPorTipo[criterio].porTipoAvaliacao).forEach(
        (tipoAv: string) => {
          const scoresArr = criteriosPorTipo[criterio].porTipoAvaliacao[tipoAv];
          criteriosPorTipo[criterio].porTipoAvaliacao[tipoAv] = {
            scores: scoresArr,
            media:
              scoresArr.reduce((a: number, b: number) => a + b, 0) /
              scoresArr.length,
          };
        },
      );
    });

    return criteriosPorTipo;
  }
  private identificarPontosFortesEFracos(avaliacoes: any[]) {
    const criteriosPorMedia: any = {};

    avaliacoes.forEach((avaliacao: any) => {
      avaliacao.answers.forEach((answer: any) => {
        const criterio = answer.criterion.title;
        if (!criteriosPorMedia[criterio]) {
          criteriosPorMedia[criterio] = {
            scores: [],
            justificativas: [],
            tipo: answer.criterion.type,
          };
        }
        criteriosPorMedia[criterio].scores.push(answer.score);
        if (answer.justification && answer.justification.trim()) {
          criteriosPorMedia[criterio].justificativas.push(answer.justification);
        }
      });
    });

    const criteriosComMedia = Object.keys(criteriosPorMedia).map(
      (criterio: string) => ({
        criterio,
        media:
          criteriosPorMedia[criterio].scores.reduce(
            (a: number, b: number) => a + b,
            0,
          ) / criteriosPorMedia[criterio].scores.length,
        tipo: criteriosPorMedia[criterio].tipo,
        justificativas: criteriosPorMedia[criterio].justificativas,
      }),
    );

    const criteriosOrdenados = criteriosComMedia.sort(
      (a, b) => b.media - a.media,
    );

    return {
      pontosForts: criteriosOrdenados.slice(0, 3), // Top 3
      pontoesFracos: criteriosOrdenados.slice(-3).reverse(), // Bottom 3
      todoseCriterios: criteriosOrdenados,
    };
  }

  private analisarVariacaoEConsistencia(avaliacoes: any[]) {
    const todasRespostass = avaliacoes.flatMap((av: any) =>
      av.answers.map((ans: any) => ans.score),
    );
    const media =
      todasRespostass.reduce((a: number, b: number) => a + b, 0) /
      todasRespostass.length;
    const variacao =
      Math.max(...todasRespostass) - Math.min(...todasRespostass);

    // Calcular desvio padrão
    const diferencasQuadradas = todasRespostass.map((score: number) =>
      Math.pow(score - media, 2),
    );
    const variancia =
      diferencasQuadradas.reduce((a: number, b: number) => a + b, 0) /
      todasRespostass.length;
    const desvioPadrao = Math.sqrt(variancia);

    return {
      media: media,
      variacao: variacao,
      desvioPadrao: desvioPadrao,
      consistencia:
        desvioPadrao < 0.5 ? 'alta' : desvioPadrao < 1 ? 'media' : 'baixa',
      totalRespostas: todasRespostass.length,
    };
  }

  private formatarAvaliacoesDetalhadas(avaliacoes: any[]) {
    return avaliacoes.map((avaliacao: any) => ({
      tipo: avaliacao.type,
      avaliador: {
        nome: avaliacao.evaluator.name,
        role: avaliacao.evaluator.role,
      },
      criterios: avaliacao.answers.map((answer: any) => ({
        titulo: answer.criterion.title,
        tipo: answer.criterion.type,
        descricao: answer.criterion.description,
        score: answer.score,
        justificativa: answer.justification || 'Sem justificativa fornecida',
      })),
      mediaAvaliacao:
        avaliacao.answers.reduce(
          (sum: number, ans: any) => sum + ans.score,
          0,
        ) / avaliacao.answers.length,
    }));
  }

  private criarPromptDetalhado(dadosEstruturados: any): string {
    const {
      usuario,
      ciclo,
      cobertura,
      medias,
      discrepancias,
      analisePortiporios,
      pontosFortesEFracos,
      analiseVariacao,
      avaliacoesDetalhadas,
    } = dadosEstruturados;

    let discrepanciasTexto = '';
    if (discrepancias.length > 0) {
      discrepanciasTexto = `\n📊 DISCREPÂNCIAS IDENTIFICADAS:
${discrepancias
  .map(
    (
      d: any,
    ) => `• ${d.tipo.replace(/_/g, ' ').toUpperCase()}: ${d.diferenca.toFixed(1)} pontos de diferença (${d.gravidade.toUpperCase()})
  Interpretação: ${d.interpretacao}`,
  )
  .join('\n')}`;
    } else {
      discrepanciasTexto =
        '\n✅ CONSISTÊNCIA: Não há discrepâncias significativas entre as avaliações.';
    }

    const pontosFortesTexto = pontosFortesEFracos.pontosForts
      .map(
        (p: any) =>
          `• ${p.criterio} (${p.tipo}): ${p.media.toFixed(1)}/5
    ${p.justificativas.length > 0 ? 'Justificativas: ' + p.justificativas.slice(0, 2).join('; ') : 'Sem justificativas detalhadas'}`,
      )
      .join('\n');

    const pontosFracosTexto = pontosFortesEFracos.pontoesFracos
      .map(
        (p: any) =>
          `• ${p.criterio} (${p.tipo}): ${p.media.toFixed(1)}/5
    ${p.justificativas.length > 0 ? 'Justificativas: ' + p.justificativas.slice(0, 2).join('; ') : 'Sem justificativas detalhadas'}`,
      )
      .join('\n');

    const criteriosDetalhados = Object.keys(analisePortiporios)
      .map((criterio: string) => {
        const dados = analisePortiporios[criterio];
        let comparacao = '';

        if (dados.porTipoAvaliacao.AUTO && dados.porTipoAvaliacao.LIDER) {
          const diff = Math.abs(
            dados.porTipoAvaliacao.AUTO.media -
              dados.porTipoAvaliacao.LIDER.media,
          );
          if (diff > 0.5) {
            comparacao = ` (⚠️ Discrepância AUTO vs LÍDER: ${diff.toFixed(1)} pontos)`;
          }
        }

        if (dados.porTipoAvaliacao.AUTO && dados.porTipoAvaliacao.PAR) {
          const diff = Math.abs(
            dados.porTipoAvaliacao.AUTO.media -
              dados.porTipoAvaliacao.PAR.media,
          );
          if (diff > 0.5) {
            comparacao += ` (⚠️ Discrepância AUTO vs PARES: ${diff.toFixed(1)} pontos)`;
          }
        }

        return `• ${criterio} (${dados.tipo}): Média ${dados.media.toFixed(1)}/5 (variação: ${dados.variacao})${comparacao}`;
      })
      .join('\n');

    const avaliacoesDetalhadasTexto = avaliacoesDetalhadas
      .map((av: any) => {
        const tipoIcon =
          av.tipo === 'AUTO' ? '🔍' : av.tipo === 'LIDER' ? '👨‍💼' : '👥';
        return `${tipoIcon} ${av.tipo} - ${av.avaliador.nome} (${av.avaliador.role}) - Média: ${av.mediaAvaliacao.toFixed(1)}/5
${av.criterios.map((c: any) => `  ${c.titulo}: ${c.score}/5 - "${c.justificativa}"`).join('\n')}`;
      })
      .join('\n\n');

    return `
Você é um especialista sênior em análise de performance organizacional com 15+ anos de experiência em desenvolvimento de talentos. Analise os dados de avaliação 360° abaixo e gere insights profundos, acionáveis e baseados em evidências.

═══════════════════════════════════════════════════════════════════════════
DADOS DO COLABORADOR
═══════════════════════════════════════════════════════════════════════════
👤 Nome: ${usuario.nome}
💼 Posição: ${usuario.posicao}
🎯 Track: ${usuario.track}
👥 Equipe: ${usuario.equipe}
📅 Ciclo: ${ciclo.nome} (${ciclo.periodo})

═══════════════════════════════════════════════════════════════════════════
COBERTURA DE AVALIAÇÕES
═══════════════════════════════════════════════════════════════════════════
📊 Total de avaliações: ${cobertura.totalAvaliacoes}
🔍 Autoavaliações: ${cobertura.autoavaliacoes}
👥 Avaliações de pares: ${cobertura.avaliacoesPares}
👨‍💼 Avaliações do líder: ${cobertura.avaliacoesLider}

═══════════════════════════════════════════════════════════════════════════
ANÁLISE ESTATÍSTICA
═══════════════════════════════════════════════════════════════════════════
📈 MÉDIAS POR TIPO:
${medias.geral ? `• Média geral: ${medias.geral.media.toFixed(1)}/5 (${medias.geral.total} respostas)` : ''}
${medias.auto ? `• Autoavaliação: ${medias.auto.media.toFixed(1)}/5` : '• Autoavaliação: Não disponível'}
${medias.pares ? `• Pares: ${medias.pares.media.toFixed(1)}/5` : '• Pares: Não disponível'}
${medias.lider ? `• Líder: ${medias.lider.media.toFixed(1)}/5` : '• Líder: Não disponível'}

📊 VARIAÇÃO E CONSISTÊNCIA:
• Variação total: ${analiseVariacao.variacao} pontos
• Desvio padrão: ${analiseVariacao.desvioPadrao.toFixed(2)}
• Consistência: ${analiseVariacao.consistencia.toUpperCase()}

${discrepanciasTexto}

═══════════════════════════════════════════════════════════════════════════
ANÁLISE POR CRITÉRIOS
═══════════════════════════════════════════════════════════════════════════
🏆 PRINCIPAIS FORÇAS:
${pontosFortesTexto}

⚠️ ÁREAS DE DESENVOLVIMENTO:
${pontosFracosTexto}

📋 TODOS OS CRITÉRIOS:
${criteriosDetalhados}

═══════════════════════════════════════════════════════════════════════════
AVALIAÇÕES DETALHADAS
═══════════════════════════════════════════════════════════════════════════
${avaliacoesDetalhadasTexto}

═══════════════════════════════════════════════════════════════════════════
INSTRUÇÕES PARA ANÁLISE
═══════════════════════════════════════════════════════════════════════════
Como especialista, você deve:

1. 🔍 ANALISAR PADRÕES: Identifique tendências nas justificativas e scores
2. 📊 COMPARAR PERSPECTIVAS: Analise diferenças entre auto, pares e líder
3. 🎯 IDENTIFICAR ROOT CAUSES: Vá além dos sintomas, encontre causas raiz
4. 💡 GERAR INSIGHTS ACIONÁVEIS: Foque em recomendações específicas e mensuráveis
5. 🚀 PLANEJAR DESENVOLVIMENTO: Sugira próximos passos concretos

GERE UMA RESPOSTA NO FORMATO JSON EXATO:

{
  "summary": "Análise executiva da performance (300-400 palavras). DEVE incluir: 1) Contexto e performance geral do colaborador, 2) Principais forças baseadas nos dados reais (cite números e justificativas específicas), 3) Áreas de melhoria com evidências dos dados, 4) Padrões identificados nas avaliações e 5) Avaliação da maturidade profissional com base na consistência das avaliações.",
  
  "discrepancies": "Análise profunda das discrepâncias (250-300 palavras). DEVE incluir: 1) Identificação específica de gaps entre autoavaliação vs pares vs líder com números, 2) Possíveis causas dessas discrepâncias baseadas nas justificativas, 3) Impactos dessas discrepâncias na performance e relacionamentos, 4) Recomendações específicas para alinhamento de percepções, 5) Se não houver discrepâncias significativas, análise da consistência e o que isso indica sobre o colaborador.",
  
  "brutalFacts": "Pontos críticos e acionáveis (200-250 palavras). DEVE incluir: 1) Os 3 principais desafios/gaps identificados com base nos dados, 2) Riscos específicos para o colaborador, equipe ou organização, 3) Ações imediatas recomendadas (próximos 30-60 dias), 4) Plano de desenvolvimento específico com cronograma, 5) Métricas para acompanhar progresso. Seja direto mas construtivo."
}

REGRAS CRÍTICAS:
❌ NÃO use dados fictícios ou suposições
❌ NÃO gere insights genéricos
❌ NÃO ignore as justificativas fornecidas
✅ SEMPRE cite números específicos dos dados
✅ SEMPRE base insights nas justificativas reais
✅ SEMPRE seja específico e acionável
✅ SEMPRE mantenha tom profissional e construtivo
`;
  }

  private gerarInsightsLocal(
    usuario: any,
    avaliacoes: any[],
    scorePerCycle: any,
    ciclo: any,
    autoavaliacoes: any[],
    avaliacoesPares: any[],
    avaliacoesLider: any[],
  ) {
    console.log('=== FALLBACK: Usando geração local ===');

    // Preparar dados estruturados mesmo para fallback
    const dadosEstruturados = this.prepararDadosParaAnalise(
      usuario,
      avaliacoes,
      scorePerCycle,
      ciclo,
      autoavaliacoes,
      avaliacoesPares,
      avaliacoesLider,
    );

    const summary = this.gerarSummary(dadosEstruturados);
    const brutalFacts = this.gerarBrutalFacts(dadosEstruturados);

    return {
      summary,
      brutalFacts,
    };
  }

  private gerarSummary(dados: any) {
    const { usuario, medias, discrepancias, pontosFortesEFracos } = dados;

    // Resumo contextualizado
    let resumo = `${usuario.nome} é um profissional na posição de ${usuario.posicao}, atuando na equipe ${usuario.equipe}. `;
    resumo += `No último ciclo avaliativo, participou de avaliações que destacam suas competências e áreas de desenvolvimento.`;

    // Destaques de performance
    if (pontosFortesEFracos.pontosForts.length > 0) {
      resumo += ` Principais forças identificadas: ${pontosFortesEFracos.pontosForts
        .map((p: any) => `${p.criterio} (Média: ${p.media.toFixed(1)}/5)`)
        .join(', ')}.`;
    }

    // Áreas de melhoria
    if (pontosFortesEFracos.pontoesFracos.length > 0) {
      resumo += ` Áreas de melhoria incluem: ${pontosFortesEFracos.pontoesFracos
        .map((p: any) => `${p.criterio} (Média: ${p.media.toFixed(1)}/5)`)
        .join(', ')}.`;
    }

    // Discrepâncias
    if (discrepancias.discrepancias.length > 0) {
      resumo += ` Foram identificadas discrepâncias entre as avaliações, sugerindo a necessidade de alinhamento em algumas áreas.`;
    } else {
      resumo += ` Não foram identificadas discrepâncias significativas, indicando um bom alinhamento nas percepções de performance.`;
    }

    return resumo;
  }

  private gerarDiscrepancies(dados: any) {
    const { discrepancias } = dados;

    if (discrepancias.discrepancias.length === 0) {
      return 'Não há discrepâncias significativas a serem abordadas.';
    }

    return `Discrepâncias identificadas: ${discrepancias.discrepancias
      .map((d: any) => {
        let descricao = `${d.tipo.replace(/_/g, ' ')}: diferença de ${d.diferenca.toFixed(1)} pontos`;
        if (d.gravidade === 'alta') {
          descricao += ' (alta gravidade)';
        }
        return descricao;
      })
      .join(
        ', ',
      )}. Recomenda-se uma reunião de feedback 360° para alinhamento.`;
  }
  private gerarBrutalFacts(dadosEstruturados: any): string {
    const {
      medias,
      pontosFortesEFracos,
      analiseVariacao,
      discrepancias,
      cobertura,
    } = dadosEstruturados;

    const facts = [];

    // Analisar a estrutura de discrepâncias (nova vs antiga)
    const analiseDiscrepancias = discrepancias.discrepancias || discrepancias;
    const coberturaInfo = discrepancias.cobertura || cobertura;
    const limitacoes = discrepancias.limitacoesDados;

    // 1. Análise de performance baseada em dados disponíveis
    if (medias.geral.media < 2.5) {
      facts.push(
        `🚨 PERFORMANCE CRÍTICA: Média ${medias.geral.media.toFixed(1)}/5 requer intervenção imediata - PIP com objetivos específicos e timeline de 60-90 dias.`,
      );
    } else if (medias.geral.media < 3.2) {
      facts.push(
        `⚠️ PERFORMANCE EM RISCO: Média ${medias.geral.media.toFixed(1)}/5 na zona de atenção - plano de desenvolvimento estruturado necessário.`,
      );
    } else if (medias.geral.media >= 4.5) {
      facts.push(
        `⭐ HIGH PERFORMER: Média ${medias.geral.media.toFixed(1)}/5 - candidato a projetos estratégicos, mentoring ou promoção.`,
      );
    } else if (medias.geral.media >= 4.0) {
      facts.push(
        `✅ PERFORMANCE SÓLIDA: Média ${medias.geral.media.toFixed(1)}/5 - focar em development de próximo nível.`,
      );
    }

    // 2. Análise de consistência e variação
    if (analiseVariacao.consistencia === 'baixa') {
      facts.push(
        `📊 PERFORMANCE INCONSISTENTE: Desvio padrão ${analiseVariacao.desvioPadrao.toFixed(2)} indica variação situacional - mapear contextos de sucesso para replicar.`,
      );
    } else if (
      analiseVariacao.consistencia === 'alta' &&
      medias.geral.media >= 4.0
    ) {
      facts.push(
        `🎯 PERFORMANCE CONSISTENTE: Baixa variação + alta média indica confiabilidade - pronto para responsabilidades maiores.`,
      );
    }

    // 3. Análise específica por cobertura de dados
    if (coberturaInfo) {
      if (!coberturaInfo.tem360 && coberturaInfo.parcial) {
        facts.push(
          `📋 DADOS LIMITADOS: Análise baseada em ${coberturaInfo.total}/3 perspectivas - incluir visão 360° no próximo ciclo para insights completos.`,
        );
      }
    }

    // 4. Análise de discrepâncias como brutal fact
    if (analiseDiscrepancias.length > 1) {
      const discrepanciasAltas = analiseDiscrepancias.filter(
        (d: any) => d.gravidade === 'alta',
      ).length;
      if (discrepanciasAltas > 0) {
        facts.push(
          `🎯 DESALINHAMENTO CRÍTICO: ${discrepanciasAltas} discrepância(s) de alta gravidade - calibração urgente necessária.`,
        );
      } else {
        facts.push(
          `🔍 MÚLTIPLAS DISCREPÂNCIAS: ${analiseDiscrepancias.length} gaps de percepção - sessões de feedback estruturado recomendadas.`,
        );
      }
    } else if (
      analiseDiscrepancias.length === 1 &&
      analiseDiscrepancias[0].gravidade === 'alta'
    ) {
      const disc = analiseDiscrepancias[0];
      facts.push(
        `⚡ GAP ESPECÍFICO: ${disc.tipo.replace(/_/g, ' ').toUpperCase()} com ${disc.diferenca.toFixed(1)} pontos de diferença - foco imediato necessário.`,
      );
    }

    // 5. Análise de pontos fracos críticos
    const weakest = pontosFortesEFracos.pontoesFracos[0];
    if (weakest && weakest.media < 2.8) {
      facts.push(
        `🎯 GAP CRÍTICO: ${weakest.criterio} (${weakest.media.toFixed(1)}/5) é limitador de performance - criar plano de ação com mentoring específico.`,
      );
    } else if (weakest && weakest.media < 3.5) {
      facts.push(
        `📈 ÁREA DE DESENVOLVIMENTO: ${weakest.criterio} (${weakest.media.toFixed(1)}/5) precisa de atenção para unlock de performance.`,
      );
    }

    // 6. Insights baseados em limitações de dados
    if (limitacoes && limitacoes.limitacoes.length > 0) {
      const limitacaoMajor =
        limitacoes.limitacoes.find((l: any) => l.tipo === 'ausencia_lider') ||
        limitacoes.limitacoes.find((l: any) => l.tipo === 'ausencia_pares');
      if (limitacaoMajor) {
        facts.push(
          `⚠️ BLIND SPOT: ${limitacaoMajor.impacto.toLowerCase()} - pode mascarar issues importantes.`,
        );
      }
    }

    // 7. Análise comparativa por tipo de avaliação
    if (medias.auto && medias.lider) {
      const gapAutoLider = Math.abs(medias.auto.media - medias.lider.media);
      if (gapAutoLider > 1.0) {
        const tendencia =
          medias.auto.media > medias.lider.media ? 'superestima' : 'subestima';
        facts.push(
          `🎭 SELF-AWARENESS: Colaborador ${tendencia} performance em ${gapAutoLider.toFixed(1)} pontos vs líder - impacta development planning.`,
        );
      }
    }

    // 8. Análise de pontos fortes como brutal fact
    const strongest = pontosFortesEFracos.pontosForts[0];
    if (strongest && strongest.media >= 4.5) {
      facts.push(
        `💪 LEVERAGE STRENGTH: ${strongest.criterio} (${strongest.media.toFixed(1)}/5) é diferencial competitivo - explorar para maximizar impact.`,
      );
    }

    // 9. Fallback se nenhum insight crítico foi identificado
    if (facts.length === 0) {
      if (medias.geral.media >= 3.5) {
        facts.push(
          `✅ BASELINE SÓLIDO: Performance adequada com média ${medias.geral.media.toFixed(1)}/5 - focar em growth específico de competências.`,
        );
      } else {
        facts.push(
          `🔍 ANÁLISE REQUER MAIS DADOS: Performance média ${medias.geral.media.toFixed(1)}/5 - expandir fontes de feedback para insights mais precisos.`,
        );
      }
    }

    return facts.join(' ');
  }

  private gerarContextoDiscrepancia(
    tipo: string,
    diferenca: number,
    media1: any,
    media2: any,
  ): string {
    const contextos: any = {
      auto_vs_pares: {
        baixa: 'Visões levemente diferentes - normal em avaliações',
        media: 'Diferença significativa indica necessidade de calibração',
        alta: 'Grande gap de percepção requer intervenção imediata',
      },
      auto_vs_lider: {
        baixa:
          'Leve diferença entre self-awareness e expectativas da liderança',
        media: 'Desalinhamento com objetivos ou expectativas da liderança',
        alta: 'Crítico disconnect entre colaborador e líder',
      },
      pares_vs_lider: {
        baixa: 'Perspectivas ligeiramente diferentes entre pares e liderança',
        media: 'Diferença de contexto ou exposure entre pares e líder',
        alta: 'Visões conflitantes requerem alinhamento organizacional',
      },
    };

    const gravidade =
      diferenca > 1.5 ? 'alta' : diferenca > 0.8 ? 'media' : 'baixa';
    return contextos[tipo][gravidade];
  }

  private analisarLimitacoesDados(
    tiposDisponveis: string[],
    mediaAuto: any,
    mediaPares: any,
    mediaLider: any,
  ) {
    const limitacoes = [];

    if (!mediaAuto) {
      limitacoes.push({
        tipo: 'ausencia_auto',
        impacto:
          'Falta de self-awareness data limita análise de calibração pessoal',
        recomendacao: 'Implementar autoavaliação estruturada no próximo ciclo',
      });
    }

    if (!mediaPares) {
      limitacoes.push({
        tipo: 'ausencia_pares',
        impacto:
          'Sem feedback de pares, análise focada apenas em hierarquia vertical',
        recomendacao: 'Incluir ao menos 2-3 peer evaluations para visão 360°',
      });
    }

    if (!mediaLider) {
      limitacoes.push({
        tipo: 'ausencia_lider',
        impacto:
          'Falta perspectiva de liderança para validar alinhamento estratégico',
        recomendacao: 'Essencial incluir avaliação de manager direto',
      });
    }

    // Análise de qualidade dos dados disponíveis
    const qualidadeDados = {
      robustez: tiposDisponveis.length / 3,
      confiabilidade: this.calcularConfiabilidadeDados(
        mediaAuto,
        mediaPares,
        mediaLider,
      ),
      completude:
        tiposDisponveis.length === 3
          ? 'completa'
          : tiposDisponveis.length === 2
            ? 'adequada'
            : 'limitada',
    };

    return {
      limitacoes,
      qualidadeDados,
      tiposDisponveis: tiposDisponveis.length,
      avaliacaoValida: tiposDisponveis.length >= 2, // Pelo menos 2 tipos para comparação
    };
  }

  private calcularConfiabilidadeDados(
    mediaAuto: any,
    mediaPares: any,
    mediaLider: any,
  ): number {
    let pontos = 0;
    let total = 0;

    if (mediaAuto) {
      pontos += mediaAuto.total >= 3 ? 2 : 1; // Mais respostas = mais confiável
      total += 2;
    }

    if (mediaPares) {
      pontos += mediaPares.total >= 5 ? 2 : mediaPares.total >= 2 ? 1.5 : 1;
      total += 2;
    }

    if (mediaLider) {
      pontos += 2; // Leader evaluation sempre tem peso alto
      total += 2;
    }

    return total > 0 ? pontos / total : 0;
  }

  private calcularMediaScores(avaliacoes: any[]) {
    if (!avaliacoes.length) return { media: 0, total: 0 };

    const allScores = avaliacoes.flatMap((av: any) =>
      av.answers.map((answer: any) => answer.score),
    );

    const media =
      allScores.reduce((sum, score) => sum + score, 0) / allScores.length;

    return {
      media: Math.round(media * 100) / 100,
      total: allScores.length,
      min: Math.min(...allScores),
      max: Math.max(...allScores),
    };
  }

  async buscarInsightsDashboard(cycleId: string) {
    try {
      const resumos = await this.prisma.genaiInsight.findMany({
        where: { cycleId: cycleId },
        include: {
          evaluated: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              position: {
                select: {
                  name: true,
                  track: true,
                },
              },
            },
          },
        },
        orderBy: {
          evaluated: {
            name: 'asc',
          },
        },
      });

      // Buscar scores para complementar os dados do dashboard
      const scoresPerCycle = await this.prisma.scorePerCycle.findMany({
        where: { cycleId: cycleId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Buscar status das avaliações
      const evaluations = await this.prisma.evaluation.findMany({
        where: { cycleId: cycleId },
        select: {
          evaluatedId: true,
          completed: true,
          type: true,
        },
      });

      // Mapear dados para o dashboard
      return resumos.map((resumo) => {
        const userScores = scoresPerCycle.find(
          (s) => s.userId === resumo.evaluatedId,
        );
        const userEvaluations = evaluations.filter(
          (e) => e.evaluatedId === resumo.evaluatedId,
        );
        const completedEvaluations = userEvaluations.filter((e) => e.completed);

        // Determinar status baseado nas avaliações
        let status = 'pendente';
        if (completedEvaluations.length > 0) {
          const hasAuto = completedEvaluations.some((e) => e.type === 'AUTO');
          const hasPeer = completedEvaluations.some((e) => e.type === 'PAR');
          const hasLeader = completedEvaluations.some(
            (e) => e.type === 'LIDER',
          );

          if (hasAuto && hasPeer && hasLeader) {
            status = 'completo';
          } else {
            status = 'parcial';
          }
        }

        return {
          id: resumo.id,
          evaluatedId: resumo.evaluatedId,
          evaluatedName: resumo.evaluated.name,
          position: resumo.evaluated.position.name,
          summary: resumo.summary,
          finalScore: userScores?.finalScore || null,
          status: status,
        };
      });
    } catch (error) {
      throw new BadRequestException('Erro ao buscar insights do dashboard');
    }
  }

  async buscarBrutalFacts(userId: string, cycleId: string) {
    try {
      const resumo = await this.prisma.genaiInsight.findFirst({
        where: {
          evaluatedId: userId,
          cycleId: cycleId,
        },
        include: {
          evaluated: {
            select: {
              name: true,
              email: true,
              role: true,
              position: {
                select: {
                  name: true,
                  track: true,
                },
              },
            },
          },
          cycle: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!resumo) {
        throw new NotFoundException(
          'Insight não encontrado para este colaborador e ciclo',
        );
      }

      // Retornar apenas os brutal facts com contexto
      return {
        id: resumo.id,
        evaluatedId: resumo.evaluatedId,
        evaluatedName: resumo.evaluated.name,
        evaluatedPosition: resumo.evaluated.position.name,
        cycleId: resumo.cycleId,
        cycleName: resumo.cycle.name,
        brutalFacts: resumo.brutalFacts,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Erro ao buscar brutal facts do colaborador',
      );
    }
  }

  async buscarEvolucaoColaborador(userId: string) {
    try {
      // Buscar insights de todos os ciclos do colaborador
      const insights = await this.prisma.genaiInsight.findMany({
        where: {
          evaluatedId: userId,
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
          evaluated: {
            select: {
              name: true,
              email: true,
              role: true,
              position: {
                select: {
                  name: true,
                  track: true,
                },
              },
            },
          },
        },
        orderBy: {
          cycle: {
            startDate: 'asc',
          },
        },
      });

      if (insights.length === 0) {
        throw new NotFoundException(
          'Nenhum insight encontrado para este colaborador',
        );
      }

      // Buscar scores históricos
      const scoresHistoricos = await this.prisma.scorePerCycle.findMany({
        where: {
          userId: userId,
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
        },
        orderBy: {
          cycle: {
            startDate: 'asc',
          },
        },
      });

      // Calcular evolução dos scores
      const evolucaoScores = scoresHistoricos.map((score, index) => {
        const anterior = index > 0 ? scoresHistoricos[index - 1] : null;
        const scoreAtual = score.finalScore || 0;
        const scoreAnterior = anterior?.finalScore || 0;
        const crescimento = anterior ? scoreAtual - scoreAnterior : 0;

        return {
          cycleId: score.cycleId,
          cycleName: score.cycle.name,
          startDate: score.cycle.startDate,
          endDate: score.cycle.endDate,
          finalScore: scoreAtual,
          selfScore: score.selfScore,
          leaderScore: score.leaderScore,
          crescimento: crescimento,
          crescimentoPercentual:
            anterior && scoreAnterior > 0
              ? ((crescimento / scoreAnterior) * 100).toFixed(1)
              : '0.0',
        };
      });

      // Mapear insights por ciclo
      const evolucaoInsights = insights.map((insight) => ({
        cycleId: insight.cycleId,
        cycleName: insight.cycle.name,
        startDate: insight.cycle.startDate,
        endDate: insight.cycle.endDate,
        summary: insight.summary,
        brutalFacts: insight.brutalFacts,
      }));

      // Dados do colaborador
      const colaborador = insights[0].evaluated;

      return {
        colaborador: {
          id: userId,
          name: colaborador.name,
          email: colaborador.email,
          role: colaborador.role,
          position: colaborador.position.name,
          track: colaborador.position.track,
        },
        totalCiclos: insights.length,
        evolucaoScores: evolucaoScores,
        evolucaoInsights: evolucaoInsights,
        resumoEvolucao: {
          scoreAtual:
            evolucaoScores[evolucaoScores.length - 1]?.finalScore || null,
          scoreInicial: evolucaoScores[0]?.finalScore || null,
          crescimentoTotal:
            evolucaoScores.length > 1
              ? (evolucaoScores[evolucaoScores.length - 1]?.finalScore || 0) -
                (evolucaoScores[0]?.finalScore || 0)
              : 0,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Erro ao buscar evolução do colaborador');
    }
  }
}
